"use client";

import { Mic, Square } from "lucide-react";

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
      className={`relative flex w-full flex-col items-center justify-center gap-2 rounded-2xl px-4 text-center transition touch-manipulation focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 active:scale-[0.99] ${
        hero ? "min-h-[8.5rem] py-6" : "min-h-[4.75rem] py-4"
      } ${
        listening
          ? "listening-pulse bg-accent-500 text-white shadow-glow"
          : "bg-brand-800 text-white shadow-soft hover:bg-brand-900"
      }`}
    >
      <span
        className={`flex items-center justify-center rounded-full ${
          hero ? "h-14 w-14" : "h-10 w-10"
        } ${listening ? "bg-white/20" : "bg-white/10"}`}
      >
        {listening ? (
          <Square className={`${hero ? "h-6 w-6" : "h-4 w-4"} fill-current`} />
        ) : (
          <Mic className={hero ? "h-7 w-7" : "h-5 w-5"} />
        )}
      </span>
      <span className={`font-semibold tracking-tight ${hero ? "text-lg sm:text-xl" : "text-sm sm:text-base"}`}>
        {label}
      </span>
      <span className={`text-xs sm:text-sm ${listening ? "text-emerald-50" : "text-brand-100"}`}>
        {listening ? "Listening… tap to stop" : hint}
      </span>
    </button>
  );
}
