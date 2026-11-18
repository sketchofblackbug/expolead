"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  FileText,
  Loader2,
  Phone,
  ShieldCheck,
  User,
} from "lucide-react";
import { VoiceCaptureButton } from "@/components/VoiceCaptureButton";
import { saveLead } from "@/lib/leads";
import {
  cleanSpokenName,
  normalizeSpokenPhone,
  validatePhoneNumber,
} from "@/lib/phone";
import {
  createSpeechRecognition,
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
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ name?: string; phone?: string }>({});
  const [speechSupported, setSpeechSupported] = useState(false);
  const [usedVoice, setUsedVoice] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition>>(null);
  const activeFieldRef = useRef<SpeechField | null>(null);

  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    return () => {
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

  const applyTranscript = (field: SpeechField, transcript: string) => {
    if (!transcript.trim()) return;

    setUsedVoice(true);

    if (field === "name") {
      const cleaned = cleanSpokenName(transcript);
      if (cleaned) {
        updateField("name", cleaned);
      }
      return;
    }

    const digits = normalizeSpokenPhone(transcript);
    if (digits) {
      updateField("phone", digits);
      return;
    }

    // Fallback: keep raw transcript so user can edit
    updateField("phone", transcript.trim());
  };

  const startListening = (field: SpeechField) => {
    setError(null);

    if (listeningField === field) {
      stopListening();
      return;
    }

    // Stop any active session before starting another field
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    const recognition = createSpeechRecognition();
    if (!recognition) {
      setError("Voice capture is not supported in this browser. Please type instead.");
      return;
    }

    activeFieldRef.current = field;
    recognition.lang = field === "phone" ? "en-IN" : "en-IN";
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const { interim, final } = getTranscriptFromEvent(event);
      if (interim) {
        setInterimText(interim);
      }
      if (final) {
        setInterimText("");
        applyTranscript(field, final);
      }
    };

    recognition.onerror = (event) => {
      const message = speechErrorMessage(event.error);
      setListeningField(null);
      setInterimText("");
      activeFieldRef.current = null;
      recognitionRef.current = null;
      setMode("idle");
      if (message) {
        setError(message);
      }
    };

    recognition.onend = () => {
      if (activeFieldRef.current === field) {
        activeFieldRef.current = null;
        setListeningField(null);
        setInterimText("");
        setMode((current) => (current === "listening" ? "idle" : current));
      }
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setListeningField(field);
    setMode("listening");
    setInterimText("");

    try {
      recognition.start();
    } catch {
      setError("Could not start the microphone. Please try again or type your details.");
      stopListening();
    }
  };

  const validateForm = (): boolean => {
    const nextErrors: { name?: string; phone?: string } = {};

    if (!form.name.trim()) {
      nextErrors.name = "Please enter your name.";
    }

    const phoneResult = validatePhoneNumber(form.phone);
    if (!phoneResult.valid) {
      nextErrors.phone = phoneResult.message ?? "Please enter a valid phone number.";
    }

    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (listeningField) {
      stopListening();
    }

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
      setInterimText("");
    } catch (err) {
      setMode("error");
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save your details. Please try again."
      );
    }
  };

  const handleReset = () => {
    stopListening();
    setForm(initialForm);
    setFieldErrors({});
    setError(null);
    setUsedVoice(false);
    setInterimText("");
    setMode("idle");
  };

  if (mode === "success") {
    return (
      <div className="surface-card px-6 py-10 text-center sm:px-8">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent-500/10 text-accent-600">
          <CheckCircle2 className="h-8 w-8" />
        </div>
        <h2 className="text-xl font-semibold text-brand-950">Lead submitted</h2>
        <p className="mt-2 text-sm text-slate-600">
          Thanks! The exhibitor has your details and will follow up soon.
        </p>
        <button type="button" onClick={handleReset} className="btn-primary mt-6">
          Submit another lead
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 px-5 py-6 text-white sm:px-7 sm:py-7">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-200">
          Booth ID
        </p>
        <h1 className="mt-1 break-all text-2xl font-semibold tracking-tight sm:text-3xl">
          {boothId}
        </h1>
        <p className="mt-2 text-sm text-brand-100">
          Speak your name and phone number, review the text, then submit.
        </p>
      </div>

      <div className="space-y-6 px-5 py-6 sm:px-7 sm:py-7">
        {speechSupported ? (
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <VoiceCaptureButton
                label="Speak Name"
                hint="Tap and say your full name"
                listening={listeningField === "name"}
                disabled={mode === "saving" || (listeningField !== null && listeningField !== "name")}
                onClick={() => startListening("name")}
              />
              <VoiceCaptureButton
                label="Speak Phone Number"
                hint="Tap and say your 10-digit number"
                listening={listeningField === "phone"}
                disabled={mode === "saving" || (listeningField !== null && listeningField !== "phone")}
                onClick={() => startListening("phone")}
              />
            </div>
            {listeningField ? (
              <div className="rounded-xl border border-accent-500/30 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900">
                <span className="mr-2 inline-block h-2 w-2 animate-pulse rounded-full bg-accent-500 align-middle" />
                Listening for {listeningField === "name" ? "name" : "phone number"}
                {interimText ? ` — “${interimText}”` : "…"}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Voice capture isn’t available in this browser. Please type your details below.
          </div>
        )}

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-900">
              <User className="h-4 w-4 text-brand-600" />
              Name
            </span>
            <input
              className={`input-field ${fieldErrors.name ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
              name="name"
              autoComplete="name"
              placeholder="Your full name"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
            />
            {fieldErrors.name ? (
              <p className="text-xs text-red-600">{fieldErrors.name}</p>
            ) : (
              <p className="text-xs text-slate-500">Editable after voice capture</p>
            )}
          </label>

          <label className="block space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-900">
              <Phone className="h-4 w-4 text-brand-600" />
              Phone number
            </span>
            <input
              className={`input-field ${fieldErrors.phone ? "border-red-300 focus:border-red-400 focus:ring-red-100" : ""}`}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="98765 43210"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              required
            />
            {fieldErrors.phone ? (
              <p className="text-xs text-red-600">{fieldErrors.phone}</p>
            ) : (
              <p className="text-xs text-slate-500">
                Indian 10-digit preferred · other formats accepted
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
              placeholder="Anything the exhibitor should know?"
              value={form.notes}
              onChange={(event) => updateField("notes", event.target.value)}
              rows={3}
            />
          </label>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          className="btn-primary w-full py-3.5 text-base"
          disabled={mode === "saving" || listeningField !== null}
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

        <p className="flex items-start gap-2 text-center text-xs leading-relaxed text-slate-500 sm:text-left">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-600" />
          <span>Your details will be shared with the exhibitor for follow-up.</span>
        </p>
      </div>
    </form>
  );
}
