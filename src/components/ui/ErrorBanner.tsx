import { AlertCircle } from "lucide-react";

interface ErrorBannerProps {
  message: string;
  tone?: "error" | "warning";
}

export function ErrorBanner({ message, tone = "error" }: ErrorBannerProps) {
  const styles =
    tone === "warning"
      ? "border-amber-200 bg-amber-50 text-amber-950"
      : "border-red-200 bg-red-50 text-red-800";

  return (
    <div
      className={`flex items-start gap-2.5 rounded-xl border px-4 py-3 text-sm ${styles}`}
      role="alert"
    >
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <p>{message}</p>
    </div>
  );
}
