"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { QrCode, LayoutDashboard, Menu, X } from "lucide-react";
import { useState } from "react";

const navItems = [
  { href: "/", label: "Home" },
  { href: "/lead/demo-booth", label: "Try capture" },
  { href: "/admin", label: "Admin" },
];

export function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    if (href.startsWith("/lead")) return pathname.startsWith("/lead");
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/70 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5">
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
              className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                isActive(item.href)
                  ? "bg-brand-50 text-brand-800"
                  : "text-slate-600 hover:bg-slate-50 hover:text-brand-900"
              }`}
            >
              {item.label}
            </Link>
          ))}
          <Link
            href="/admin"
            className="ml-2 inline-flex items-center gap-2 rounded-xl bg-brand-800 px-3.5 py-2 text-sm font-semibold text-white transition hover:bg-brand-900"
          >
            <LayoutDashboard className="h-4 w-4" aria-hidden />
            Dashboard
          </Link>
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-brand-900 md:hidden"
          aria-label={open ? "Close menu" : "Open menu"}
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
                className="rounded-lg px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-brand-50 hover:text-brand-900"
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
