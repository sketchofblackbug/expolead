"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  Check,
  Copy,
  Download,
  Link2,
  Printer,
  QrCode,
} from "lucide-react";
import { buildLeadCaptureUrl, normalizeBoothId } from "@/lib/app-url";

export function QrGenerator() {
  const [boothInput, setBoothInput] = useState("demo-booth");
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("http://localhost:3000");
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setBaseUrl(
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || window.location.origin
    );
  }, []);

  const boothId = useMemo(() => normalizeBoothId(boothInput), [boothInput]);
  const leadUrl = useMemo(
    () => (boothId ? buildLeadCaptureUrl(boothId, baseUrl) : ""),
    [boothId, baseUrl]
  );

  const handleCopy = async () => {
    if (!leadUrl) return;
    try {
      await navigator.clipboard.writeText(leadUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = leadUrl;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    if (!boothId) return;
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;

    const exportCanvas = document.createElement("canvas");
    const padding = 32;
    const size = canvas.width;
    exportCanvas.width = size + padding * 2;
    exportCanvas.height = size + padding * 2;

    const ctx = exportCanvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    ctx.drawImage(canvas, padding, padding);

    const link = document.createElement("a");
    link.download = `expolead-qr-${boothId}.png`;
    link.href = exportCanvas.toDataURL("image/png");
    link.click();
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-brand-600">
          <QrCode className="h-3.5 w-3.5" />
          Booth QR
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl">
          QR code generator
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
          Print this QR and place it at your booth. When visitors scan it, they
          can speak their details.
        </p>
      </div>

      <div className="surface-card p-5 sm:p-7">
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-brand-900">
            Booth ID / Name
          </span>
          <input
            className="input-field min-h-12"
            value={boothInput}
            onChange={(event) => setBoothInput(event.target.value)}
            placeholder="e.g. booth-a1 or North Hall 12"
            autoComplete="off"
            enterKeyHint="done"
          />
          <p className="text-xs text-slate-500">
            Used in the URL as{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-700">
              /lead/{boothId || "your-booth"}
            </code>
          </p>
        </label>

        {!boothId ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center text-sm text-slate-500">
            Enter a booth ID to generate your QR code.
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div
              ref={canvasWrapRef}
              className="mx-auto flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-4 shadow-soft"
            >
              <QRCodeCanvas
                value={leadUrl}
                size={220}
                level="M"
                includeMargin={false}
                bgColor="#ffffff"
                fgColor="#0f2744"
              />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Capture link
                </p>
                <p className="mt-1 break-all rounded-xl bg-slate-50 px-3 py-2.5 font-mono text-xs text-brand-900 ring-1 ring-slate-200 sm:text-sm">
                  {leadUrl}
                </p>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={handleDownload} className="btn-primary flex-1">
                  <Download className="h-4 w-4" />
                  Download PNG
                </button>
                <button type="button" onClick={handleCopy} className="btn-secondary flex-1">
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-accent-600" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy link
                    </>
                  )}
                </button>
              </div>

              <a
                href={leadUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-sm font-medium text-brand-700 hover:underline"
              >
                <Link2 className="h-4 w-4" />
                Open capture page
              </a>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-brand-100 bg-brand-50/70 px-5 py-4 text-sm text-brand-900">
        <div className="flex gap-3">
          <Printer className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" />
          <div>
            <p className="font-semibold">How to use</p>
            <ol className="mt-2 list-decimal space-y-1 pl-4 text-brand-800/90">
              <li>Enter your booth ID and download the PNG.</li>
              <li>Print it at a large size and place it at eye level.</li>
              <li>Visitors scan → land on the capture page → speak name & phone.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
