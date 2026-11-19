import type { WhatsAppStatus } from "@/types/lead";

const STYLES: Record<string, string> = {
  sent: "bg-sky-50 text-sky-800 ring-sky-200",
  delivered: "bg-emerald-50 text-emerald-800 ring-emerald-200",
  read: "bg-teal-50 text-teal-900 ring-teal-200",
  failed: "bg-red-50 text-red-800 ring-red-200",
  skipped: "bg-slate-100 text-slate-600 ring-slate-200",
  pending: "bg-amber-50 text-amber-900 ring-amber-200",
};

export function WhatsAppStatusBadge({
  status,
  error,
}: {
  status: WhatsAppStatus | string | null | undefined;
  error?: string | null;
}) {
  if (!status) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  const style = STYLES[status] ?? "bg-slate-100 text-slate-700 ring-slate-200";

  return (
    <span className="inline-flex max-w-full flex-col gap-0.5">
      <span
        className={`inline-flex w-fit items-center rounded-lg px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1 ${style}`}
        title={error || undefined}
      >
        {status}
      </span>
      {error && (status === "failed" || status === "skipped") ? (
        <span className="line-clamp-2 text-[11px] leading-snug text-slate-500" title={error}>
          {error}
        </span>
      ) : null}
    </span>
  );
}
