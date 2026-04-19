import type { Metadata } from "next";
import { Manrope, Geist } from "next/font/google";
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
      <body className="bg-surface text-on-surface antialiased min-h-screen flex flex-col font-sans">
        {children}
      </body>
    </html>
  );
}
