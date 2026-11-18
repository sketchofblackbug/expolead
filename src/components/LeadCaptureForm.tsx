"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  CheckCircle2,
  Mic,
  MicOff,
  Phone,
  RotateCcw,
  User,
  Loader2,
} from "lucide-react";
import { saveLead } from "@/lib/leads";
import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  parseSpokenLead,
} from "@/lib/speech";
import type { CaptureMode, LeadCaptureFormState } from "@/types/lead";

interface LeadCaptureFormProps {
  boothId: string;
}

const initialForm: LeadCaptureFormState = {
  name: "",
  phone: "",
};

export function LeadCaptureForm({ boothId }: LeadCaptureFormProps) {
  const [form, setForm] = useState<LeadCaptureFormState>(initialForm);
  const [mode, setMode] = useState<CaptureMode>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef<ReturnType<typeof createSpeechRecognition>>(null);

  useEffect(() => {
    setSpeechSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
    };
  }, []);

  const updateField = (field: keyof LeadCaptureFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  };

  const startListening = () => {
    setError(null);
    const recognition = createSpeechRecognition();
    if (!recognition) {
      setError("Voice capture is not supported in this browser. Please type instead.");
      return;
    }

    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event) => {
      const result = Array.from(event.results)
        .map((entry) => entry[0]?.transcript ?? "")
        .join(" ")
        .trim();

      setTranscript(result);
      const parsed = parseSpokenLead(result);
      setForm((prev) => ({
        name: parsed.name || prev.name,
        phone: parsed.phone || prev.phone,
      }));
    };

    recognition.onerror = (event) => {
      setMode("idle");
      setError(
        event.error === "not-allowed"
          ? "Microphone permission was denied. You can still type your details."
          : "Voice capture failed. Please try again or type your details."
      );
    };

    recognition.onend = () => {
      setMode((current) => (current === "listening" ? "review" : current));
      recognitionRef.current = null;
    };

    recognitionRef.current = recognition;
    setMode("listening");
    setTranscript("");
    recognition.start();
  };

  const handleToggleListen = () => {
    if (mode === "listening") {
      stopListening();
      setMode("review");
      return;
    }
    startListening();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);

    if (!form.name.trim() || !form.phone.trim()) {
      setError("Please provide both a name and phone number.");
      setMode("error");
      return;
    }

    try {
      setMode("saving");
      await saveLead({
        booth_id: boothId,
        name: form.name,
        phone: form.phone,
      });
      setMode("success");
      setForm(initialForm);
      setTranscript("");
    } catch (err) {
      setMode("error");
      setError(err instanceof Error ? err.message : "Unable to save lead.");
    }
  };

  const handleReset = () => {
    stopListening();
    setForm(initialForm);
    setTranscript("");
    setError(null);
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
          Thanks for stopping by. Our team has your details and will follow up soon.
        </p>
        <button type="button" onClick={handleReset} className="btn-primary mt-6">
          Capture another lead
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="surface-card overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-br from-brand-900 to-brand-700 px-6 py-7 text-white sm:px-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
          Booth {boothId}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          Leave your details in seconds
        </h1>
        <p className="mt-2 max-w-md text-sm text-brand-100">
          Tap the mic and say your name and phone number, or type them below.
        </p>
      </div>

      <div className="space-y-6 px-6 py-7 sm:px-8">
        {speechSupported ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-6">
            <button
              type="button"
              onClick={handleToggleListen}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full text-white shadow-soft transition ${
                mode === "listening"
                  ? "listening-pulse bg-accent-500 shadow-glow"
                  : "bg-brand-800 hover:bg-brand-900"
              }`}
              aria-label={mode === "listening" ? "Stop listening" : "Start voice capture"}
            >
              {mode === "listening" ? (
                <MicOff className="h-8 w-8" />
              ) : (
                <Mic className="h-8 w-8" />
              )}
            </button>
            <p className="text-sm font-medium text-brand-900">
              {mode === "listening"
                ? "Listening… say your name and number"
                : "Tap to speak"}
            </p>
            {transcript ? (
              <p className="max-w-sm text-center text-xs text-slate-500">
                Heard: “{transcript}”
              </p>
            ) : null}
          </div>
        ) : (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Voice capture isn’t available in this browser. Please enter your details manually.
          </div>
        )}

        <div className="space-y-4">
          <label className="block space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-900">
              <User className="h-4 w-4 text-brand-600" />
              Full name
            </span>
            <input
              className="input-field"
              name="name"
              autoComplete="name"
              placeholder="Jane Doe"
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              required
            />
          </label>

          <label className="block space-y-1.5">
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-900">
              <Phone className="h-4 w-4 text-brand-600" />
              Phone number
            </span>
            <input
              className="input-field"
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="+1 555 000 1234"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              required
            />
          </label>
        </div>

        {error ? (
          <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="submit"
            className="btn-primary w-full sm:flex-1"
            disabled={mode === "saving" || mode === "listening"}
          >
            {mode === "saving" ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save my details"
            )}
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="btn-secondary w-full sm:w-auto"
            disabled={mode === "saving"}
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </div>
    </form>
  );
}
