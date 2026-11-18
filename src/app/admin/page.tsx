import type { Metadata } from "next";
import { AdminDashboard } from "@/components/AdminDashboard";

export const metadata: Metadata = {
  title: "Admin",
  description: "View and export exhibition leads captured with ExpoLead.",
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <AdminDashboard />
    </div>
  );
}
