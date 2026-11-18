import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
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

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "ExpoLead — Exhibition lead capture",
    template: "%s · ExpoLead",
  },
  description:
    "Visitors scan a booth QR code, speak their name and phone number, and exhibitors get clean leads instantly.",
  applicationName: "ExpoLead",
  authors: [{ name: "ExpoLead" }],
  keywords: [
    "exhibition lead capture",
    "trade show QR",
    "voice lead capture",
    "booth CRM",
    "ExpoLead",
  ],
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    siteName: "ExpoLead",
    title: "ExpoLead — Scan. Speak. Capture leads.",
    description:
      "Mobile-first exhibition lead capture with voice input, QR codes, and a simple admin dashboard.",
  },
  twitter: {
    card: "summary",
    title: "ExpoLead",
    description:
      "Scan a booth QR, speak your details, and exhibitors get the lead instantly.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#0f2744" },
  ],
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
          <SiteFooter />
        </div>
      </body>
    </html>
  );
}
