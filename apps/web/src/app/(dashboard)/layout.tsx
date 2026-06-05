import { Sidebar } from "@/components/layout/sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <Sidebar />
      <main className="pl-60">
        <div className="mx-auto max-w-7xl p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
