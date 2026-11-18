import type { Metadata } from "next";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";

interface LeadPageProps {
  params: {
    boothId: string;
  };
}

export function generateMetadata({ params }: LeadPageProps): Metadata {
  const boothId = decodeURIComponent(params.boothId);
  return {
    title: `Booth ${boothId}`,
    description: `Share your name and phone with booth ${boothId} using ExpoLead voice capture.`,
    robots: {
      index: false,
      follow: false,
    },
  };
}

export default function LeadCapturePage({ params }: LeadPageProps) {
  const boothId = decodeURIComponent(params.boothId);

  return (
    <div className="mx-auto w-full max-w-lg px-3 py-4 sm:px-6 sm:py-8">
      <LeadCaptureForm boothId={boothId} />
    </div>
  );
}
