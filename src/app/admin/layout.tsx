import { AdminShell } from "@/components/AdminShell";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
