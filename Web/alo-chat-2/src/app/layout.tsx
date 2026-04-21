import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import AuthProvider from "../components/layout/AuthProvider";
import CallProvider from "../components/layout/CallProvider";
import { Toaster } from "sonner";
import { GoogleOAuthProvider } from "@react-oauth/google";
import GlobalNotificationHandler from "../components/layout/GlobalNotificationHandler";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Alo Chat Web",
  description: "Chat Application",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="vi">
      <body
        suppressHydrationWarning
        className={`${inter.className} min-h-screen text-black bg-white`}
      >
        <GoogleOAuthProvider
          clientId={
            process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "mock_client_id"
          }
        >
          <AuthProvider>
            <CallProvider>
              <GlobalNotificationHandler />
              <Toaster position="bottom-right" expand={true} richColors />
              {children}
            </CallProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
      </body>
    </html>
  );
}
