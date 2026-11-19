"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  FileText,
  Info,
  Loader2,
  MicOff,
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
import type {
  BoothPublicInfo,
  CaptureMode,
  LeadCaptureFormState,
  ListeningField,
} from "@/types/lead";

interface LeadCaptureFormProps {
  boothId: string;
}

const initialForm: LeadCaptureFormState = {
  name: "",
  phone: "",
  notes: "",
};

const SUCCESS_RESET_MS = 4500;
/** Stop listening after this much quiet time */
const SILENCE_STOP_MS = 3500;
/** Hard cap so a session never runs forever */
const MAX_LISTEN_MS = 20000;

const CONFETTI_COLORS = ["#10b981", "#1d4ed8", "#34d399", "#60a5fa", "#0f2744", "#93c5fd"];

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
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null);
  const [usedVoice, setUsedVoice] = useState(false);
  const [consent, setConsent] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [touchedPhone, setTouchedPhone] = useState(false);
  const [boothInfo, setBoothInfo] = useState<BoothPublicInfo | null>(null);

  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition>>(null);
  const activeFieldRef = useRef<SpeechField | null>(null);
  const shouldRestartRef = useRef(false);
  const accumulatedRef = useRef("");
  const successTimerRef = useRef<number | null>(null);
  const silenceTimerRef = useRef<number | null>(null);
  const maxListenTimerRef = useRef<number | null>(null);
  const lastSpeechAtRef = useRef(0);

  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    let active = true;
    const loadBooth = async () => {
      try {
        const response = await fetch(`/api/booths/${encodeURIComponent(boothId)}`);
        const data = (await response.json()) as { booth?: BoothPublicInfo };
        if (active && data.booth) setBoothInfo(data.booth);
      } catch {
        if (active) {
          setBoothInfo({
            id: boothId,
            brand_name: boothId,
            booth_location: "",
            brochure_url: "",
            whatsapp_enabled: true,
          });
        }
      }
    };
    void loadBooth();
    return () => {
      active = false;
    };
  }, [boothId]);

  const brandName = boothInfo?.brand_name?.trim() || boothId;

  const clearListenTimers = () => {
    if (silenceTimerRef.current) {
      window.clearInterval(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (maxListenTimerRef.current) {
      window.clearTimeout(maxListenTimerRef.current);
      maxListenTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      clearListenTimers();
      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
      try {
        recognitionRef.current?.abort();
      } catch {
        // ignore cleanup errors
      }
    };
  }, []);

  const phoneResult = useMemo(() => validatePhoneNumber(form.phone), [form.phone]);
  const nameOk = form.name.trim().length > 0;
  const phoneOk = phoneResult.valid;
  const canSubmit = nameOk && phoneOk && consent && mode !== "saving" && listeningField === null;

  const updateField = (field: keyof LeadCaptureFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (field === "name" || field === "phone") {
      setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  const stopListening = () => {
    shouldRestartRef.current = false;
    clearListenTimers();
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

  const markSpeechActivity = () => {
    lastSpeechAtRef.current = Date.now();
  };

  const startSilenceWatch = () => {
    clearListenTimers();
    lastSpeechAtRef.current = Date.now();

    silenceTimerRef.current = window.setInterval(() => {
      if (Date.now() - lastSpeechAtRef.current >= SILENCE_STOP_MS) {
        stopListening();
      }
    }, 400);

    maxListenTimerRef.current = window.setTimeout(() => {
      stopListening();
    }, MAX_LISTEN_MS);
  };

  const applyFieldTranscript = (field: Exclude<SpeechField, "auto">, transcript: string) => {
    if (!transcript.trim()) return;
    setUsedVoice(true);

    if (field === "name") {
      const cleaned = cleanSpokenName(transcript);
      if (cleaned) updateField("name", cleaned);
      return;
    }

    setTouchedPhone(true);
    const digits = normalizeSpokenPhone(transcript);
    const formatted = formatPhoneInput(digits || transcript.trim());
    updateField("phone", formatted);
    const check = validatePhoneNumber(formatted);
    setFieldErrors((prev) => ({
      ...prev,
      phone: check.valid ? undefined : check.message,
    }));
  };

  const applyAutoTranscript = (chunk: string) => {
    if (!chunk.trim()) return;
    setUsedVoice(true);
    accumulatedRef.current = `${accumulatedRef.current} ${chunk}`.trim();
    setLiveTranscript(accumulatedRef.current);

    const parsed = parseSpokenLead(accumulatedRef.current);
    setForm((prev) => ({
      ...prev,
      name: parsed.name || prev.name,
      phone: parsed.phone || prev.phone,
      notes: parsed.notes || prev.notes,
    }));

    if (parsed.phone) {
      setTouchedPhone(true);
      const phoneCheck = validatePhoneNumber(parsed.phone);
      setFieldErrors((prev) => ({
        ...prev,
        name: parsed.name ? undefined : prev.name,
        phone: phoneCheck.valid ? undefined : phoneCheck.message,
      }));
    } else if (parsed.name) {
      setFieldErrors((prev) => ({ ...prev, name: undefined }));
    }
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
      if (interim || final) {
        markSpeechActivity();
      }
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
      // Let the silence watcher stop the session (don't reset the quiet timer)
      if (event.error === "no-speech") {
        return;
      }

      const message = speechErrorMessage(event.error);
      shouldRestartRef.current = false;
      clearListenTimers();
      setListeningField(null);
      setInterimText("");
      activeFieldRef.current = null;
      recognitionRef.current = null;
      setMode("idle");
      if (message) setError(message);
    };

    recognition.onend = () => {
      // Restart only while still actively listening and silence limit not hit
      if (shouldRestartRef.current && activeFieldRef.current === field) {
        try {
          recognition.start();
          return;
        } catch {
          // fall through to stop
        }
      }

      clearListenTimers();
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
    startSilenceWatch();

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

    const result = validatePhoneNumber(form.phone);
    if (!result.valid) {
      nextErrors.phone = result.message ?? "Please enter a valid 10-digit mobile number.";
    }

    if (!consent) {
      nextErrors.consent = `Please agree so ${brandName} can contact you on WhatsApp and phone.`;
    }

    setFieldErrors(nextErrors);
    setTouchedPhone(true);
    return Object.keys(nextErrors).length === 0;
  };

  const resetFormState = () => {
    setForm(initialForm);
    setFieldErrors({});
    setError(null);
    setUsedVoice(false);
    setConsent(false);
    setTouchedPhone(false);
    setInterimText("");
    setLiveTranscript("");
    accumulatedRef.current = "";
    setMode("idle");
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (listeningField) stopListening();

    if (!validateForm()) {
      setMode("error");
      return;
    }

    const result = validatePhoneNumber(form.phone);

    try {
      setMode("saving");
      await saveLead({
        booth_id: boothId,
        name: form.name.trim(),
        phone: result.normalized,
        notes: form.notes.trim() || null,
        source: usedVoice ? "voice" : "manual",
        consent: true,
      });

      // Clear only after success
      setForm(initialForm);
      setFieldErrors({});
      setUsedVoice(false);
      setConsent(false);
      setTouchedPhone(false);
      setInterimText("");
      setLiveTranscript("");
      accumulatedRef.current = "";
      setMode("success");

      if (successTimerRef.current) {
        window.clearTimeout(successTimerRef.current);
      }
      successTimerRef.current = window.setTimeout(() => {
        setMode("idle");
      }, SUCCESS_RESET_MS);
    } catch (err) {
      // Keep all form data so the visitor can retry
      setMode("error");
      setError(
        friendlySaveError(
          err instanceof Error
            ? err.message
            : "We couldn’t save your details. Please try again."
        )
      );
    }
  };

  const handleReset = () => {
    stopListening();
    if (successTimerRef.current) {
      window.clearTimeout(successTimerRef.current);
    }
    resetFormState();
  };

  if (mode === "success") {
    return (
      <div
        className="surface-card relative overflow-hidden px-5 py-10 text-center sm:px-8 sm:py-12"
        role="status"
        aria-live="polite"
      >
        <div className="confetti-burst" aria-hidden>
          {CONFETTI_COLORS.map((color, index) => (
            <span
              key={`${color}-${index}`}
              className="confetti-piece"
              style={{
                backgroundColor: color,
                marginLeft: `${(index - 2.5) * 18}px`,
                animationDelay: `${index * 45}ms`,
                width: index % 2 === 0 ? 7 : 9,
                height: index % 2 === 0 ? 11 : 8,
              }}
            />
          ))}
        </div>

        <div className="success-pop relative mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-accent-500 text-white shadow-glow">
          <CheckCircle2 className="h-11 w-11" strokeWidth={2.25} />
        </div>
        <p className="relative text-xs font-semibold uppercase tracking-[0.18em] text-accent-600">
          Success
        </p>
        <h2 className="relative mt-2 text-balance text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl">
          Lead saved successfully!
        </h2>
        <p className="relative mx-auto mt-3 max-w-sm text-pretty text-base leading-relaxed text-slate-600">
          Thanks for stopping by. The exhibitor will contact you soon.
        </p>
        <p className="relative mt-5 text-xs text-slate-400">
          This form resets automatically in a few seconds…
        </p>
        <button
          type="button"
          onClick={handleReset}
          className="btn-primary relative mt-6 min-h-12 w-full max-w-xs"
        >
          Submit another lead
        </button>
      </div>
    );
  }

  const isListening = listeningField !== null;
  const showPhoneError = Boolean(fieldErrors.phone) || (touchedPhone && !phoneOk && form.phone.trim().length > 0);
  const phoneErrorText =
    fieldErrors.phone ||
    (touchedPhone && !phoneOk ? phoneResult.message : undefined);

  return (
    <form
      onSubmit={handleSubmit}
      className="surface-card overflow-hidden"
      noValidate
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-4 py-5 text-white sm:px-7 sm:py-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-200">
          {brandName !== boothId ? brandName : "Booth"}
        </p>
        <h1 className="mt-1 break-words text-xl font-semibold tracking-tight sm:break-all sm:text-3xl">
          {boothId}
        </h1>
        {boothInfo?.booth_location ? (
          <p className="mt-1 text-sm text-brand-200">{boothInfo.booth_location}</p>
        ) : null}
        <p className="mt-2 text-sm leading-relaxed text-brand-100">
          Say your name and phone number — or type them below — then submit.
        </p>
      </div>

      <div className="space-y-5 px-4 py-5 sm:space-y-6 sm:px-7 sm:py-7">
        {speechSupported === null ? null : speechSupported ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-xl border border-brand-100 bg-brand-50/80 px-3.5 py-3 text-xs leading-relaxed text-brand-900 sm:text-sm">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" aria-hidden />
              <p>
                Voice works best on Android Chrome. On iPhone, please type your details or use
                Chrome.
              </p>
            </div>

            <VoiceCaptureButton
              size="hero"
              label={listeningField === "auto" ? "Stop Voice Capture" : "Start Voice Capture"}
              hint="Say: “My name is … and my number is …”"
              listening={listeningField === "auto"}
              disabled={mode === "saving" || (isListening && listeningField !== "auto")}
              onClick={() => startListening("auto")}
            />

            {isListening ? (
              <div className="listening-panel rounded-2xl border-2 border-accent-500/40 bg-gradient-to-br from-emerald-50 to-white px-4 py-4 shadow-glow">
                <div className="flex items-center justify-center gap-2 text-sm font-semibold text-emerald-900">
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-500 opacity-60" />
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-accent-500" />
                  </span>
                  Listening…
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
                <p className="mt-2 text-center text-[11px] text-emerald-800/70">
                  Stops automatically after a few seconds of silence
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
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm text-amber-950">
            <MicOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" aria-hidden />
            <p>
              Voice input is not supported on this browser. Please type your details.
            </p>
          </div>
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
              className={`input-field min-h-12 ${showPhoneError ? "border-red-300 focus:border-red-400 focus:ring-red-100" : phoneOk ? "border-accent-500/50 focus:border-accent-500 focus:ring-emerald-100" : ""}`}
              name="phone"
              type="tel"
              inputMode="numeric"
              autoComplete="tel"
              placeholder="98765 43210"
              value={form.phone}
              aria-invalid={showPhoneError}
              onChange={(event) => {
                setTouchedPhone(true);
                const formatted = formatPhoneInput(event.target.value);
                updateField("phone", formatted);
                const result = validatePhoneNumber(formatted);
                setFieldErrors((prev) => ({
                  ...prev,
                  phone: formatted && !result.valid ? result.message : undefined,
                }));
              }}
              onBlur={() => {
                setTouchedPhone(true);
                const result = validatePhoneNumber(form.phone);
                if (result.valid) {
                  updateField("phone", formatPhoneInput(result.normalized));
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
            {showPhoneError && phoneErrorText ? (
              <p className="text-xs font-medium text-red-600">{phoneErrorText}</p>
            ) : phoneOk ? (
              <p className="text-xs font-medium text-accent-600">Looks good — 10-digit Indian mobile</p>
            ) : (
              <p className="text-xs text-slate-500">
                10 digits starting with 6–9 · spaces, dashes, and +91 are removed automatically
              </p>
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

        <div
          className={`rounded-2xl border px-4 py-3.5 ${
            fieldErrors.consent
              ? "border-red-300 bg-red-50/70"
              : "border-slate-200 bg-slate-50/80"
          }`}
        >
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-brand-700">
            Required consent
          </p>
          <label className="flex items-start gap-3 text-sm leading-relaxed text-slate-700">
            <input
              type="checkbox"
              required
              aria-required="true"
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-slate-300 text-brand-700 focus:ring-brand-500"
              checked={consent}
              onChange={(event) => {
                setConsent(event.target.checked);
                setFieldErrors((prev) => ({ ...prev, consent: undefined }));
              }}
            />
            <span>
              <span className="font-medium text-brand-950">
                I agree to be contacted by {brandName} on WhatsApp and phone.
              </span>{" "}
              Your name and number are only used for this booth’s follow-up.
            </span>
          </label>
          {fieldErrors.consent ? (
            <p className="mt-2 text-xs font-medium text-red-600">{fieldErrors.consent}</p>
          ) : (
            <p className="mt-2 text-xs text-slate-500">
              Required — WhatsApp is only sent after you check this box.
            </p>
          )}
        </div>

        {error ? <ErrorBanner message={error} /> : null}

        <button
          type="submit"
          className="btn-primary min-h-12 w-full py-3.5 text-base touch-manipulation"
          disabled={!canSubmit}
        >
          {mode === "saving" ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Submit Lead"
          )}
        </button>

        {!canSubmit && mode !== "saving" ? (
          <p className="text-center text-xs text-slate-500">
            Submit unlocks when name, a valid 10-digit mobile, and consent are complete.
          </p>
        ) : null}

        <p className="flex items-start justify-center gap-2 text-center text-xs leading-relaxed text-slate-500">
          <Waves className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
          Tip: speak naturally — you can edit the fields before submitting.
        </p>
      </div>
    </form>
  );
}
