import type { Metadata } from "next";
import { QrGenerator } from "@/components/QrGenerator";

export const metadata: Metadata = {
  title: "QR Generator",
  description:
    "Generate a printable booth QR code that opens the ExpoLead capture page.",
};

export default function QrGeneratorPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <QrGenerator />
    </div>
  );
}
