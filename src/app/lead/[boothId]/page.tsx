import type { Metadata } from "next";
import { LeadCaptureForm } from "@/components/LeadCaptureForm";

interface LeadPageProps {
  params: {
    boothId: string;
  };
}

export function generateMetadata({ params }: LeadPageProps): Metadata {
  return {
    title: `Booth ${params.boothId}`,
    description: `Capture your details for booth ${params.boothId} with ExpoLead.`,
  };
}

export default function LeadCapturePage({ params }: LeadPageProps) {
  const boothId = decodeURIComponent(params.boothId);

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:px-6 sm:py-10">
      <LeadCaptureForm boothId={boothId} />
      <p className="mt-4 text-center text-xs text-slate-400">Powered by ExpoLead</p>
    </div>
  );
}
