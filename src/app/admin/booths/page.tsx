import type { Metadata } from "next";
import { BoothsAdmin } from "@/components/BoothsAdmin";

export const metadata: Metadata = {
  title: "Booth settings",
  robots: { index: false, follow: false },
};

export default function AdminBoothsPage() {
  return <BoothsAdmin />;
}
