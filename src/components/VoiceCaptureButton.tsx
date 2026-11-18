"use client";

import { Mic } from "lucide-react";

interface VoiceCaptureButtonProps {
  label: string;
  hint: string;
  listening: boolean;
  disabled?: boolean;
  size?: "default" | "hero";
  onClick: () => void;
}

export function VoiceCaptureButton({
  label,
  hint,
  listening,
  disabled,
  size = "default",
  onClick,
}: VoiceCaptureButtonProps) {
  const hero = size === "hero";

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={listening}
      className={`relative flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 px-3 text-center transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.99] sm:px-4 ${
        hero ? "min-h-[7.5rem] py-5 sm:min-h-[8.5rem] sm:py-6" : "min-h-[4.75rem] py-4"
      } ${
        listening
          ? "listening-pulse border-accent-400 bg-accent-500 text-white shadow-glow"
          : "border-transparent bg-brand-800 text-white shadow-soft hover:bg-brand-900"
      }`}
    >
      <span
        className={`relative flex items-center justify-center rounded-full ${
          hero ? "h-12 w-12 sm:h-14 sm:w-14" : "h-10 w-10"
        } ${listening ? "bg-white/20 mic-pulse" : "bg-white/10"}`}
      >
        {listening ? (
          <>
            <span className="mic-ring" aria-hidden />
            <Mic className={`${hero ? "h-6 w-6 sm:h-7 sm:w-7" : "h-5 w-5"} relative z-10`} />
          </>
        ) : (
          <Mic className={hero ? "h-6 w-6 sm:h-7 sm:w-7" : "h-5 w-5"} />
        )}
      </span>
      <span
        className={`font-semibold tracking-tight ${
          hero ? "text-base sm:text-xl" : "text-sm sm:text-base"
        }`}
      >
        {listening ? "Listening…" : label}
      </span>
      <span className={`text-xs sm:text-sm ${listening ? "text-emerald-50" : "text-brand-100"}`}>
        {listening ? "Speak now · tap to stop" : hint}
      </span>
    </button>
  );
}
