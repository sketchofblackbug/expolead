import Link from "next/link";
import {
  ArrowRight,
  Mic,
  QrCode,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";

const steps = [
  {
    title: "Print a QR for each booth",
    description: "Every booth gets a unique capture link. Visitors scan and land instantly.",
    icon: QrCode,
  },
  {
    title: "Visitors speak their details",
    description: "Name and phone are captured by voice—or typed—on a mobile-first page.",
    icon: Mic,
  },
  {
    title: "Your team follows up",
    description: "Leads appear in the admin dashboard ready for outreach after the show.",
    icon: Users,
  },
];

export default function HomePage() {
  return (
    <div>
      <section className="relative overflow-hidden">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 pb-16 pt-12 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:pb-24 lg:pt-16">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-brand-700 shadow-sm">
              <Sparkles className="h-3.5 w-3.5 text-accent-500" />
              Exhibition lead capture
            </p>
            <h1 className="mt-5 text-4xl font-semibold tracking-tight text-brand-950 sm:text-5xl lg:text-[3.4rem] lg:leading-[1.08]">
              ExpoLead
            </h1>
            <p className="mt-4 max-w-xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Turn booth traffic into clean contact data. Visitors scan a QR code,
              speak their name and phone number, and your team gets leads without
              clipboards or business-card piles.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/qr-generator" className="btn-primary">
                Generate booth QR
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/lead/demo-booth" className="btn-secondary">
                Try the capture page
              </Link>
            </div>
            <div className="mt-8 flex items-center gap-2 text-sm text-slate-500">
              <ShieldCheck className="h-4 w-4 text-accent-600" />
              Built for mobile. Ready for Supabase. Auth coming next.
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-brand-200/50 via-white to-accent-400/20 blur-2xl" />
            <div className="relative surface-card overflow-hidden p-5 sm:p-6">
              <div className="rounded-2xl bg-gradient-to-br from-brand-900 via-brand-800 to-brand-700 p-6 text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
                  Live booth flow
                </p>
                <h2 className="mt-3 text-2xl font-semibold">Scan → Speak → Saved</h2>
                <ol className="mt-6 space-y-4">
                  {[
                    "Visitor opens /lead/your-booth",
                    "Says “Priya Sharma, 98765 43210”",
                    "Lead lands in your dashboard",
                  ].map((item, index) => (
                    <li key={item} className="flex items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/15 text-xs font-semibold">
                        {index + 1}
                      </span>
                      <span className="text-sm text-brand-50">{item}</span>
                    </li>
                  ))}
                </ol>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Capture latency</p>
                  <p className="mt-1 text-lg font-semibold text-brand-950">&lt; 10s</p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                  <p className="text-xs text-slate-500">Best for</p>
                  <p className="mt-1 text-lg font-semibold text-brand-950">Trade shows</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200/70 bg-white/60">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
          <div className="max-w-2xl">
            <h2 className="text-2xl font-semibold tracking-tight text-brand-950 sm:text-3xl">
              How it works
            </h2>
            <p className="mt-2 text-sm text-slate-600 sm:text-base">
              One simple path from the show floor to your CRM-ready lead list.
            </p>
          </div>
          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {steps.map((step) => (
              <article key={step.title} className="surface-card p-5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                  <step.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-brand-950">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {step.description}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
