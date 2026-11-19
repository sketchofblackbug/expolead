import type { Lead } from "@/types/lead";

function escapeCsvValue(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function leadsToCsv(leads: Lead[]): string {
  const headers = [
    "Name",
    "Phone",
    "Booth ID",
    "Date/Time",
    "Notes",
    "Source",
    "Consent",
    "WhatsApp Status",
    "WhatsApp Error",
    "Email",
    "ID",
  ];

  const rows = leads.map((lead) =>
    [
      lead.name,
      lead.phone,
      lead.booth_id,
      lead.created_at,
      lead.notes ?? "",
      lead.source,
      lead.consent ? "yes" : "no",
      lead.whatsapp_status ?? "",
      lead.whatsapp_error ?? "",
      lead.email ?? "",
      lead.id,
    ]
      .map((value) => escapeCsvValue(String(value)))
      .join(",")
  );

  return [headers.join(","), ...rows].join("\n");
}

export function downloadLeadsCsv(leads: Lead[], filename?: string): void {
  const csv = leadsToCsv(leads);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const stamp = new Date().toISOString().slice(0, 10);

  link.href = url;
  link.download = filename ?? `expolead-leads-${stamp}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
