import type { Metadata } from "next";
import { WhatsAppTestPanel } from "@/components/WhatsAppTestPanel";

export const metadata: Metadata = {
  title: "WhatsApp test",
  robots: { index: false, follow: false },
};

export default function WhatsAppTestPage() {
  return <WhatsAppTestPanel />;
}
