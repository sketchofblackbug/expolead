import type { Metadata } from "next";
import { AdminLeadTable } from "@/components/AdminLeadTable";

export const metadata: Metadata = {
  title: "Admin",
  description: "View and manage exhibition leads captured with ExpoLead.",
};

export default function AdminPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <AdminLeadTable />
    </div>
  );
}
