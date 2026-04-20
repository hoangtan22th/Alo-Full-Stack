"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ServerStackIcon, ShieldCheckIcon } from "@heroicons/react/24/outline";
import { authService } from "@/services/authService";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const token = await authService.login(email, password);

      // Save token in cookie (valid for 7 days)
      document.cookie = `admin_token=${token}; path=/; max-age=604800; samesite=Lax`;

      // Redirect to the dashboard
      router.push("/");
      router.refresh();
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full min-h-screen bg-surface">
      {/* Decorative Splash Area - Hidden on small screens */}
      <div className="hidden lg:flex w-1/2 bg-surface-container-low flex-col justify-center items-center relative overflow-hidden">
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03]">
          <ServerStackIcon className="w-[40rem] h-[40rem] text-on-surface" />
        </div>
        <div className="z-10 flex flex-col items-center text-center px-12 max-w-lg">
          <div className="inline-flex items-center justify-center p-4 bg-primary/10 rounded-2xl mb-8">
            <ShieldCheckIcon className="w-12 h-12 text-primary" />
          </div>
          <h2 className="text-[2.5rem] leading-tight font-extrabold text-on-surface tracking-tight mb-4">
            Alo-Chat Workspace
          </h2>
          <p className="text-on-surface-variant text-lg">
            Centralized command and control module for enterprise
            communications, analytics, and infrastructure oversight.
          </p>
        </div>
      </div>

      {/* Form Area */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center p-8 lg:p-24 relative bg-surface">
        <div className="w-full max-w-md mx-auto flex flex-col justify-center h-full">
          <div className="text-left mb-12">
            <h1 className="text-4xl font-extrabold tracking-tight text-on-surface mb-3">
              Admin Console
            </h1>
            <p className="text-on-surface-variant text-lg">
              Securely authenticate to manage the system.
            </p>
          </div>

          {error && (
            <div className="p-4 rounded-xl bg-red-50/80 text-red-600 text-sm flex items-center font-semibold mb-6">
              <span className="mr-2"></span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="block text-sm font-bold text-on-surface">
                Administrator Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-5 py-4 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface"
                placeholder="admin@alo.com"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-on-surface">
                Secure Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-5 py-4 rounded-xl bg-surface-container-lowest border border-outline-variant focus:border-primary focus:ring-4 focus:ring-primary/10 outline-none transition-all text-on-surface"
                placeholder="******"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-6 bg-primary text-on-primary rounded-xl font-extrabold text-lg hover:opacity-90 hover:-translate-y-0.5 transition-all shadow-[0_8px_16px_rgba(37,99,235,0.2)] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none mt-6 flex items-center justify-center gap-3"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-on-primary/30 border-t-on-primary rounded-full animate-spin" />
                  <span>Authenticating...</span>
                </div>
              ) : (
                "Log in to Dashboard"
              )}
            </button>
          </form>

          <div className="pt-10 mt-auto flex items-center justify-center gap-2 text-on-surface-variant text-sm font-medium">
            <span>Protected by Enterprise SSO Architecture</span>
          </div>
        </div>
      </div>
    </div>
  );
}
