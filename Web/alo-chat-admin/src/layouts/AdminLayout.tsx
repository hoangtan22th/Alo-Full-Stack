import { Outlet } from "react-router-dom";
import { Sidebar } from "../components/Sidebar";
import { Header } from "../components/Header";

export function AdminLayout() {
  return (
    <div className="text-on-background antialiased bg-[#f3f3f4] min-h-screen">
      <Sidebar />
      <main className="ml-64 min-h-screen relative">
        <Header />
        <div className="mt-16 p-8 space-y-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
