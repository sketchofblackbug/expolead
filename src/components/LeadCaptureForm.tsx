"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Phone,
  User,
  Waves,
} from "lucide-react";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { VoiceCaptureButton } from "@/components/VoiceCaptureButton";
import { saveLead } from "@/lib/leads";
import {
  cleanSpokenName,
  formatPhoneInput,
  normalizeSpokenPhone,
  parseSpokenLead,
  validatePhoneNumber,
} from "@/lib/phone";
import {
  createSpeechRecognition,
  friendlySaveError,
  getTranscriptFromEvent,
  isSpeechRecognitionSupported,
  speechErrorMessage,
  type SpeechField,
} from "@/lib/speech";
import type { CaptureMode, LeadCaptureFormState, ListeningField } from "@/types/lead";

interface LeadCaptureFormProps {
  boothId: string;
}

const initialForm: LeadCaptureFormState = {
  name: "",
  phone: "",
  notes: "",
};

export function LeadCaptureForm({ boothId }: LeadCaptureFormProps) {
  const [form, setForm] = useState<LeadCaptureFormState>(initialForm);
  const [mode, setMode] = useState<CaptureMode>("idle");
  const [listeningField, setListeningField] = useState<ListeningField>(null);
  const [interimText, setInterimText] = useState("");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string; consent?: string }>(
    {}
  );
  const [speechSupported, setSpeechSupported] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const [consent, setConsent] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition>>(null);
  const activeFieldRef = useRef<SpeechField | null>(null);
  const shouldRestartRef = useRef(false);
  const accumulatedRef = useRef("");

  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  const updateField = (field: keyof LeadCaptureFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "name" || field === "phone") {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    try {
      recognitionRef.current?.stop();
    } catch {
      // ignore
    }
    recognitionRef.current = null;
    activeFieldRef.current = null;
    setListeningField(null);
    setInterimText("");
    setMode((current) => (current === "listening" ? "idle" : current));
  };

  const applyFieldTranscript = (field: Exclude<SpeechField, "auto">, transcript: string) => {
    if (!transcript.trim()) return;
    setUsedVoice(true);

    if (field === "name") {
      const cleaned = cleanSpokenName(transcript);
      if (cleaned) updateField("name", cleaned);
      return;
    }

    const digits = normalizeSpokenPhone(transcript);
    updateField("phone", formatPhoneInput(digits || transcript.trim()));
  };

  const applyAutoTranscript = (chunk: string) => {
    if (!chunk.trim()) return;
    setUsedVoice(true);
    accumulatedRef.current = `${accumulatedRef.current} ${chunk}`.trim();
    setLiveTranscript(accumulatedRef.current);

    const parsed = parseSpokenLead(accumulatedRef.current);
    setForm((prev) => ({
      ...prev,
      // Always prefer freshly extracted name (never keep filler phrases)
      name: parsed.name || prev.name,
      phone: parsed.phone || prev.phone,
      notes: parsed.notes || prev.notes,
    }));

    const phoneCheck = parsed.phone ? validatePhoneNumber(parsed.phone) : null;
    setFieldErrors((prev) => ({
      ...prev,
      name: parsed.name ? undefined : prev.name,
      phone: phoneCheck && !phoneCheck.valid ? phoneCheck.message : undefined,
    }));
  };

  const startListening = (field: SpeechField) => {
    setError(null);

    if (listeningField === field || (field === "auto" && listeningField === "auto")) {
      stopListening();
      return;
    }

    if (recognitionRef.current) {
      shouldRestartRef.current = false;
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const recognition = createSpeechRecognition();
    if (!recognition) {
      setError("Voice capture isn’t supported in this browser. Please type your details below.");
      return;
    }

    const continuous = field === "auto";
    activeFieldRef.current = field;
    shouldRestartRef.current = continuous;
    if (continuous) {
      accumulatedRef.current = "";
      setLiveTranscript("");
    }

    recognition.lang = "en-IN";
    recognition.continuous = continuous;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const { interim, final } = getTranscriptFromEvent(event);
      if (interim) setInterimText(interim);

      if (final) {
        setInterimText("");
        if (field === "auto") {
          applyAutoTranscript(final);
        } else {
          applyFieldTranscript(field, final);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted") return;
      // In continuous mode, no-speech is common between phrases — keep listening
      if (continuous && event.error === "no-speech") return;

      const message = speechErrorMessage(event.error);
      shouldRestartRef.current = false;
      setListeningField(null);
      setInterimText("");
      activeFieldRef.current = null;
      recognitionRef.current = null;
      setMode("idle");
      if (message) setError(message);
    };

    recognition.onend = () => {
      // Chrome often ends continuous sessions after a pause — restart while active
      if (shouldRestartRef.current && activeFieldRef.current === field) {
        try {
          recognition.start();
          return;
        } catch {
          // fall through to stop
        }
      }

      if (activeFieldRef.current === field) {
        activeFieldRef.current = null;
        setListeningField(null);
        setInterimText("");
        setMode((current) => (current === "listening" ? "idle" : current));
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setListeningField(field === "auto" ? "auto" : field);
    setMode("listening");
    setInterimText("");

    try {
      recognition.start();
    } catch {
      setError("Couldn’t start the microphone. Check permissions, then try again — or type below.");
      stopListening();
    }
  };

  const validateForm = (): boolean => {
    const nextErrors: { name?: string; phone?: string; consent?: string } = {};
    const cleanedName = form.name.trim();

    if (!cleanedName) {
      nextErrors.name = "Please enter your name.";
    } else if (cleanedName.split(/\s+/).length > 5) {
      nextErrors.name = "Please enter only your name (not a full sentence).";
    } else if (
      /^(hi|hello|hey|my name is|i am|i'm)\b/i.test(cleanedName) ||
      /\b(phone|number|mobile)\b/i.test(cleanedName)
    ) {
      nextErrors.name = "Please enter only your name — remove greetings or extra words.";
    }

    const phoneResult = validatePhoneNumber(form.phone);
    if (!phoneResult.valid) {
      nextErrors.phone = phoneResult.message ?? "Please enter a valid phone number.";
    }

    if (!consent) {
      nextErrors.consent = "Please agree so the exhibitor can follow up with you.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (listeningField) stopListening();

    if (!validateForm()) {
      setMode("error");
      return;
    }

    const phoneResult = validatePhoneNumber(form.phone);

    try {
      setMode("saving");
      await saveLead({
        booth_id: boothId,
        name: form.name.trim(),
        phone: phoneResult.normalized,
        notes: form.notes.trim() || null,
        source: usedVoice ? "voice" : "manual",
      });
      setMode("success");
      setForm(initialForm);
      setFieldErrors({});
      setUsedVoice(false);
      setConsent(false);
      setInterimText("");
      setLiveTranscript("");
      accumulatedRef.current = "";
    } catch (err) {
      setMode("error");
      setError(
        friendlySaveError(err instanceof Error ? err.message : "Unable to save your details.")
      );
    }
  };

  const handleReset = () => {
    stopListening();
    setForm(initialForm);
    setFieldErrors({});
    setError(null);
    setUsedVoice(false);
    setConsent(false);
    setInterimText("");
    setLiveTranscript("");
    accumulatedRef.current = "";
    setMode("idle");
  };

  if (mode === "success") {
    return (
      <div className="surface-card px-6 py-10 text-center sm:px-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-500/10 text-accent-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold text-brand-950">You’re all set</h2>
        <p className="mt-2 text-sm text-slate-600">
          Thanks! This booth has your details and can follow up with you.
        </p>
        <button type="button" onClick={handleReset} className="btn-primary mt-6 min-h-12 w-full sm:w-auto">
          Submit another lead
        </button>
      </div>
    );
  }

  const isListening = listeningField !== null;

  return (
    <form onSubmit={handleSubmit} className="surface-card overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-5 py-6 text-white sm:px-7 sm:py-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-200">
          Booth
        </p>
        <h1 className="mt-1 break-all text-2xl font-semibold tracking-tight sm:text-3xl">
          {boothId}
        </h1>
        <p className="mt-2 text-sm text-brand-100">
          Say your name and phone number — or type them below — then submit.
        </p>
      </div>

      <div className="space-y-5 px-5 py-6 sm:space-y-6 sm:px-7 sm:py-7">
        {speechSupported ? (
          <div className="space-y-3">
            <VoiceCaptureButton
              size="hero"
              label={listeningField === "auto" ? "Stop Voice Capture" : "Start Voice Capture"}
              hint="Say: “My name is … and my number is …”"
              listening={listeningField === "auto"}
              disabled={mode === "saving" || (isListening && listeningField !== "auto")}
              onClick={() => startListening("auto")}
            />

            {isListening ? (
              <div className="listening-panel rounded-2xl border border-accent-500/25 bg-gradient-to-br from-emerald-50 to-white px-4 py-4">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-900">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-60" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-accent-500" />
                  </span>
                  Listening
                  {listeningField === "auto"
                    ? " for name & phone"
                    : listeningField === "name"
                      ? " for your name"
                      : " for your phone number"}
                </div>
                <div className="mt-3 flex items-end justify-center gap-1" aria-hidden>
                  {[0, 1, 2, 3, 4].map((i) => (
                    <span key={i} className={`voice-bar voice-bar-${i + 1}`} />
                  ))}
                </div>
                <p className="mt-3 text-center text-sm text-emerald-900/80">
                  {interimText
                    ? `“${interimText}”`
                    : liveTranscript
                      ? `Heard: “${liveTranscript}”`
                      : "Speak clearly toward your phone mic…"}
                </p>
              </div>
            ) : null}

            <button
              type="button"
              className="text-xs font-medium text-brand-700 underline-offset-2 hover:underline"
              onClick={() => setShowAdvanced((value) => !value)}
            >
              {showAdvanced ? "Hide one-field voice buttons" : "Prefer separate Speak Name / Phone buttons?"}
            </button>

            {showAdvanced ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <VoiceCaptureButton
                  label="Speak Name"
                  hint="Tap and say your full name"
                  listening={listeningField === "name"}
                  disabled={mode === "saving" || (isListening && listeningField !== "name")}
                  onClick={() => startListening("name")}
                />
                <VoiceCaptureButton
                  label="Speak Phone Number"
                  hint="Tap and say your 10-digit number"
                  listening={listeningField === "phone"}
                  disabled={mode === "saving" || (isListening && listeningField !== "phone")}
                  onClick={() => startListening("phone")}
                />
              </div>
            ) : null}
          </div>
        ) : (
          <ErrorBanner
            tone="warning"
            message="Voice capture isn’t available in this browser. Please type your details below — Chrome on Android/desktop works best."
          />
        )}

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-900">
              <User className="h-4 w-4 text-brand-600" />
              Name
            </span>
            <input
              className={`input-field min-h-12 ${fieldErrors.name ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
              name="name"
              autoComplete="name"
              placeholder="Your full name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              onBlur={() => {
                const cleaned = cleanSpokenName(form.name);
                if (cleaned && cleaned !== form.name) updateField("name", cleaned);
              }}
              required
            />
            {fieldErrors.name ? (
              <p className="text-xs text-red-600">{fieldErrors.name}</p>
            ) : (
              <p className="text-xs text-slate-500">Name only — greetings are removed automatically</p>
            )}
          </label>

          <label className="block space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-900">
              <Phone className="h-4 w-4 text-brand-600" />
              Phone number
            </span>
            <input
              className={`input-field min-h-12 ${fieldErrors.phone ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              value={form.phone}
              onChange={(event) => {
                const formatted = formatPhoneInput(event.target.value);
                updateField("phone", formatted);
                if (formatted.replace(/\D/g, "").length > 0) {
                  const result = validatePhoneNumber(formatted);
                  setFieldErrors((prev) => ({
                    ...prev,
                    phone: result.valid ? undefined : result.message,
                  }));
                }
              }}
              onBlur={() => {
                const result = validatePhoneNumber(form.phone);
                if (result.valid) {
                  updateField("phone", result.normalized);
                  setFieldErrors((prev) => ({ ...prev, phone: undefined }));
                } else if (form.phone.trim()) {
                  setFieldErrors((prev) => ({
                    ...prev,
                    phone: result.message,
                  }));
                }
              }}
              required
            />
            {fieldErrors.phone ? (
              <p className="text-xs text-red-600">{fieldErrors.phone}</p>
            ) : (
              <p className="text-xs text-slate-500">Must be a full 10-digit Indian mobile (starts with 6–9)</p>
            )}
          </label>

          <label className="block space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-900">
              <FileText className="h-4 w-4 text-brand-600" />
              Additional notes{" "}
              <span className="font-normal text-slate-400">(optional)</span>
            </span>
            <textarea
              className="input-field min-h-[6.5rem] resize-y"
              name="notes"
              placeholder="Anything this booth should know?"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={3}
            />
          </label>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3">
          <label className="flex items-start gap-3 text-sm text-slate-700">
            <input
              type="checkbox"
              className="mt-1 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                setFieldErrors((prev) => ({ ...prev, consent: undefined }));
              }}
            />
            <span>
              I agree to share my name and phone number with this exhibitor for follow-up
              about their products or services.{" "}
              <span className="text-slate-500">
                Your details are only used for this booth’s outreach.
              </span>
            </span>
          </label>
          {fieldErrors.consent ? (
            <p className="mt-2 text-xs text-red-600">{fieldErrors.consent}</p>
          ) : null}
        </div>

        {error ? <ErrorBanner message={error} /> : null}

        <button
          type="submit"
          className="btn-primary min-h-12 w-full py-3.5 text-base touch-manipulation"
          disabled={mode === "saving" || isListening}
        >
          {mode === "saving" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting…
            </>
          ) : (
            "Submit Lead"
          )}
        </button>

        <p className="flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-slate-500">
          <Waves className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
          Tip: speak naturally — you can edit the fields before submitting.
        </p>
      </div>
    </form>
  );
}
