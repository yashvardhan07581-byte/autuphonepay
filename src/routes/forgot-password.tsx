import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import logoUrl from "@/assets/panme-logo.jpg";

export const Route = createFileRoute("/forgot-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "AutoUPI | Forgot Password" },
      { name: "description", content: "Reset your AutoUPI account password." },
    ],
  }),
  component: ForgotPasswordPage,
});

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!email) {
      return toast.error("Please enter your email");
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;

      setSent(true);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e8f5ee] via-[#dfeee5] to-[#cfe3d5] flex items-center justify-center p-5 sm:p-6">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-6">
          <img
            src={logoUrl}
            alt="AutoUPI"
            className="w-11 h-11 object-contain rounded-xl bg-[#0d4a3a] p-1.5"
          />
          <div>
            <div className="text-xl font-bold text-[#0d4a3a]">AutoUPI</div>
            <div className="text-[10px] text-gray-500 -mt-0.5">Payment Gateway</div>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-6 sm:p-8">
          {sent ? (
            /* Success state */
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8 text-emerald-600" />
              </div>
              <h2 className="text-2xl font-bold text-[#0d1b2a] mb-2">
                Check Your Email
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                We've sent a password reset link to <strong>{email}</strong>.
                Check your inbox (and spam folder).
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6 text-xs text-blue-800">
                Didn't receive the email? Wait 1-2 minutes, then try again. Check spam folder.
              </div>
              <div className="space-y-3">
                <Link
                  to="/auth"
                  className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold transition shadow-lg"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Login
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setSent(false);
                    setEmail("");
                  }}
                  className="w-full py-3 text-sm text-gray-600 hover:text-gray-800 font-medium"
                >
                  Try another email
                </button>
              </div>
            </div>
          ) : (
            /* Form state */
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center">
                <div className="w-14 h-14 rounded-full bg-[#0d4a3a]/10 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-7 h-7 text-[#0d4a3a]" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0d1b2a]">
                  Forgot Password?
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  Enter your email and we'll send you a reset link
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-[#0d1b2a] mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0d4a3a] focus:ring-2 focus:ring-[#0d4a3a]/15 outline-none text-sm transition bg-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-xl bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold tracking-wide transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#0d4a3a]/20"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Sending...
                  </>
                ) : (
                  <>
                    Send Reset Link <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              <p className="text-center text-sm text-gray-600">
                Remember your password?{" "}
                <Link to="/auth" className="font-bold text-[#0d4a3a] hover:underline">
                  Sign in
                </Link>
              </p>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}