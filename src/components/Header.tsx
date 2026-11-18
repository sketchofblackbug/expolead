"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/lead/demo-booth", label: "Try capture" },
  { href: "/qr-generator", label: "QR generator" },
  { href: "/admin", label: "Admin" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isLeadPage = pathname.startsWith("/lead/");

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/lead")) return pathname.startsWith("/lead");
    return pathname.startsWith(href);
  };

  // Minimal chrome on visitor capture pages
  if (isLeadPage) {
    return (
      <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-800 text-white">
              <QrCode className="h-4 w-4" aria-hidden />
            </span>
            <span className="text-base font-semibold tracking-tight text-brand-950">
              ExpoLead
            </span>
          </Link>
          <span className="text-xs font-medium text-slate-500">Lead capture</span>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 items-center justify-between px-4 sm:h-16 sm:px-6 md:max-w-6xl">
        <Link href="/" className="flex min-h-11 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-800 text-white shadow-soft">
            <QrCode className="h-5 w-5" aria-hidden />
          </span>
          <span className="text-lg font-semibold tracking-tight text-brand-950">
            ExpoLead
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-brand-50 text-brand-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-brand-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/login"
            className="ml-2 inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-800 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-900"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            Admin
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-brand-900 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className="rounded-xl px-3 py-3 text-base font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-900"
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </header>
  );
}
