import type { Metadata } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/Header";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: {
    default: "ExpoLead",
    template: "%s · ExpoLead",
  },
  description:
    "Exhibition lead capture made simple. Visitors scan a QR code, speak their details, and your team gets the lead instantly.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh font-sans antialiased`}
      >
        <div className="flex min-h-dvh flex-col">
          <Header />
          <main className="flex-1">{children}</main>
          <footer className="border-t border-slate-200/80 bg-white/70">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p>© {new Date().getFullYear()} ExpoLead</p>
              <p>Scan. Speak. Capture leads at the booth.</p>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
