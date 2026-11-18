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
  AlertTriangle,
} from "lucide-react";
import {
  buildLeadCaptureUrl,
  isScannableBaseUrl,
  normalizeBoothId,
} from "@/lib/app-url";

export function QrGenerator() {
  const [boothInput, setBoothInput] = useState("demo-booth");
  const [copied, setCopied] = useState(false);
  const [baseUrl, setBaseUrl] = useState("");
  const [ready, setReady] = useState(false);
  const canvasWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Always prefer the site the exhibitor is viewing — never bake localhost into phone QRs
    const origin = window.location.origin;
    const envUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "";

    if (isScannableBaseUrl(origin)) {
      setBaseUrl(origin);
    } else if (isScannableBaseUrl(envUrl)) {
      setBaseUrl(envUrl);
    } else {
      setBaseUrl(origin); // local dev preview only
    }
    setReady(true);
  }, []);

  const boothId = useMemo(() => normalizeBoothId(boothInput), [boothInput]);
  const leadUrl = useMemo(
    () => (boothId && baseUrl ? buildLeadCaptureUrl(boothId, baseUrl) : ""),
    [boothId, baseUrl]
  );
  const canScanOnPhone = isScannableBaseUrl(baseUrl);

  const handleCopy = async () => {
    if (!leadUrl) return;
    try {
      await navigator.clipboard.writeText(leadUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
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
    if (!boothId || !canScanOnPhone) return;
    const canvas = canvasWrapRef.current?.querySelector("canvas");
    if (!canvas) return;

    const exportCanvas = document.createElement("canvas");
    const padding = 40;
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

        {!ready ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center text-sm text-slate-500">
            Preparing scannable link…
          </div>
        ) : !boothId ? (
          <div className="mt-8 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-16 text-center text-sm text-slate-500">
            Enter a booth ID to generate your QR code.
          </div>
        ) : !canScanOnPhone ? (
          <div className="mt-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <p className="font-semibold">This QR won’t open on a phone yet</p>
              <p className="mt-1">
                You’re on a local address (<code>{baseUrl || "localhost"}</code>).
                Open this page on your live site (e.g.{" "}
                <code>https://expolead-nu.vercel.app/qr-generator</code>) to
                generate a phone-scannable QR.
              </p>
            </div>
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-[auto_1fr] sm:items-center">
            <div
              ref={canvasWrapRef}
              className="mx-auto flex items-center justify-center rounded-2xl border border-slate-200 bg-white p-5 shadow-soft"
            >
              <QRCodeCanvas
                value={leadUrl}
                size={256}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#0f2744"
              />
            </div>

            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Capture link (encoded in QR)
                </p>
                <p className="mt-1 break-all rounded-xl bg-slate-50 px-3 py-2.5 font-mono text-xs text-brand-900 ring-1 ring-slate-200 sm:text-sm">
                  {leadUrl}
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  Scan with your phone camera — it should open this link directly.
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
              <li>Generate the QR on your live HTTPS site (not localhost).</li>
              <li>Download the PNG, print large, place at eye level.</li>
              <li>Visitors scan with their camera → capture page opens → speak details.</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
