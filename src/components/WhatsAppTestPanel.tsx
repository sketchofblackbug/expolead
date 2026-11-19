"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, MessageCircle } from "lucide-react";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { formatPhoneInput, validatePhoneNumber } from "@/lib/phone";
import type { Booth } from "@/types/lead";

export function WhatsAppTestPanel() {
  const [phone, setPhone] = useState("");
  const [visitorName, setVisitorName] = useState("Test Visitor");
  const [boothId, setBoothId] = useState("");
  const [booths, setBooths] = useState<Booth[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/booths");
        const data = (await response.json()) as { booths?: Booth[] };
        if (response.ok) setBooths(data.booths ?? []);
      } catch {
        // ignore
      }
    })();
  }, []);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    const phoneResult = validatePhoneNumber(phone);
    if (!phoneResult.valid) {
      setError(phoneResult.message ?? "Enter a valid phone number.");
      return;
    }

    setSending(true);
    try {
      const response = await fetch("/api/whatsapp/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: phoneResult.normalized,
          visitorName,
          boothId: boothId || undefined,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        messageId?: string;
        to?: string;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Test send failed.");
      }
      setSuccess(
        `Template sent to ${data.to ?? phoneResult.normalized}. Message id: ${data.messageId}`
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Test send failed.");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <Link
          href="/admin"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-brand-700 hover:underline"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to leads
        </Link>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl">
          WhatsApp test
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Send the approved template to a number you control. Uses server env credentials only.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="surface-card max-w-lg space-y-4 p-4 sm:p-5">
        <div className="flex items-center gap-2 text-brand-800">
          <MessageCircle className="h-5 w-5" />
          <p className="text-sm font-medium">Template test send</p>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-brand-900">Phone number</span>
          <input
            className="input-field"
            type="tel"
            inputMode="numeric"
            placeholder="98765 43210"
            value={phone}
            onChange={(event) => setPhone(formatPhoneInput(event.target.value))}
            required
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-brand-900">Visitor name (param 1)</span>
          <input
            className="input-field"
            value={visitorName}
            onChange={(event) => setVisitorName(event.target.value)}
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-brand-900">
            Booth (brand / location / brochure)
          </span>
          <select
            className="input-field"
            value={boothId}
            onChange={(event) => setBoothId(event.target.value)}
          >
            <option value="">Demo defaults</option>
            {booths.map((booth) => (
              <option key={booth.id} value={booth.id}>
                {booth.brand_name} ({booth.id})
              </option>
            ))}
          </select>
        </label>

        {error ? <ErrorBanner message={error} /> : null}
        {success ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {success}
          </div>
        ) : null}

        <button type="submit" className="btn-primary w-full" disabled={sending}>
          {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {sending ? "Sending…" : "Send test template"}
        </button>
      </form>
    </div>
  );
}
