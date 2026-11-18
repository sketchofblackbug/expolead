"use client";

import { Mic, Square } from "lucide-react";

interface VoiceCaptureButtonProps {
  label: string;
  hint: string;
  listening: boolean;
  disabled?: boolean;
  onClick: () => void;
}

export function VoiceCaptureButton({
  label,
  hint,
  listening,
  disabled,
  onClick,
}: VoiceCaptureButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={listening}
      className={`relative flex min-h-[7.5rem] w-full flex-col items-center justify-center gap-2 rounded-2xl px-4 py-5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 ${
        listening
          ? "listening-pulse bg-accent-500 text-white shadow-glow"
          : "bg-brand-800 text-white shadow-soft hover:bg-brand-900 active:scale-[0.99]"
      }`}
    >
      <span
        className={`flex h-12 w-12 items-center justify-center rounded-full ${
          listening ? "bg-white/20" : "bg-white/10"
        }`}
      >
        {listening ? <Square className="h-5 w-5 fill-current" /> : <Mic className="h-6 w-6" />}
      </span>
      <span className="text-base font-semibold tracking-tight sm:text-lg">{label}</span>
      <span className={`text-xs sm:text-sm ${listening ? "text-emerald-50" : "text-brand-100"}`}>
        {listening ? "Listening… tap to stop" : hint}
      </span>
    </button>
  );
}
