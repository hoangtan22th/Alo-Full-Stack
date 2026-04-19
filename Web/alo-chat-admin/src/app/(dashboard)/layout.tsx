import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 w-full min-h-screen relative">
      <Sidebar />
      <main className="flex-1 flex flex-col w-full md:pl-72 bg-surface">
        <Header />
        <div className="flex-1 w-full flex flex-col p-6 lg:p-12 gap-8">
          {children}
        </div>
      </main>
    </div>
  );
}
