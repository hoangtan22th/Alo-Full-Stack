import type { Metadata } from "next";
import { Manrope, Geist } from "next/font/google";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import "./globals.css";
import { cn } from "@/lib/utils";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

const fontManrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  weight: ["400", "500", "600", "700", "800"], // Explicit weights per spec
  display: "swap",
});

export const metadata: Metadata = {
  title: "Alo-Chat Admin Dashboard",
  description: "B2B Enterprise Admin Dashboard for Alo-Chat.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className="bg-surface text-on-surface antialiased flex min-h-screen font-sans">
        <Sidebar />
        <main className="flex-1 flex flex-col min-h-screen md:ml-72 bg-surface">
          <Header />
          <div className="flex-1 p-8 lg:p-12 space-y-8">{children}</div>
        </main>
      </body>
    </html>
  );
}
