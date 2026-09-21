import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Eye, EyeOff, Lock, Check, ArrowRight, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { swalSuccess } from "@/lib/swal";
import logoUrl from "@/assets/panme-logo.jpg";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "AutoUPI | Reset Password" },
      { name: "description", content: "Reset your AutoUPI account password." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [validSession, setValidSession] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setValidSession(true);
      } else {
        const hash = window.location.hash;
        if (hash && hash.includes("access_token")) {
          setValidSession(true);
        }
      }
      setChecking(false);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!password) {
      return toast.error("Please enter a password");
    }
    if (password !== confirmPassword) {
      return toast.error("Passwords do not match");
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      await swalSuccess("Password updated successfully!");

      setTimeout(() => {
        navigate({ to: "/dashboard" });
      }, 1500);
    } catch (e: any) {
      toast.error(e.message ?? "Failed to update password");
    } finally {
      setLoading(false);
    }
  }

  if (checking) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#e8f5ee] via-[#dfeee5] to-[#cfe3d5] flex items-center justify-center p-6">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[#0d4a3a] mx-auto" />
          <p className="text-sm text-gray-600 mt-3">Verifying reset link...</p>
        </div>
      </main>
    );
  }

  if (!validSession) {
    return (
      <main className="min-h-screen bg-gradient-to-br from-[#e8f5ee] via-[#dfeee5] to-[#cfe3d5] flex items-center justify-center p-5 sm:p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-6 sm:p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-[#0d1b2a] mb-2">
              Invalid Reset Link
            </h2>
            <p className="text-sm text-gray-600 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link
              to="/auth"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold transition shadow-lg"
            >
              Back to Login <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e8f5ee] via-[#dfeee5] to-[#cfe3d5] flex items-center justify-center p-5 sm:p-6">
      <div className="w-full max-w-md">
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

        <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="text-center">
              <div className="w-14 h-14 rounded-full bg-[#0d4a3a]/10 flex items-center justify-center mx-auto mb-3">
                <Lock className="w-7 h-7 text-[#0d4a3a]" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0d1b2a]">
                Set New Password
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Enter your new password
              </p>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-sm font-medium text-[#0d1b2a] mb-1.5">
                New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showPass ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 focus:border-[#0d4a3a] focus:ring-2 focus:ring-[#0d4a3a]/15 outline-none text-sm transition bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-[#0d1b2a] mb-1.5">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type={showConfirm ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter password"
                  className="w-full pl-10 pr-11 py-3 rounded-xl border border-gray-200 focus:border-[#0d4a3a] focus:ring-2 focus:ring-[#0d4a3a]/15 outline-none text-sm transition bg-white"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {confirmPassword.length > 0 && (
                <div className="mt-2 flex items-center gap-1.5">
                  {password === confirmPassword ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                      <span className="text-xs text-emerald-600">Passwords match</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs text-red-600">Passwords do not match</span>
                    </>
                  )}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || !password || password !== confirmPassword}
              className="w-full py-3.5 rounded-xl bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold tracking-wide transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#0d4a3a]/20"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Updating...
                </>
              ) : (
                <>
                  Update Password <ArrowRight className="w-4 h-4" />
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
        </div>
      </div>
    </main>
  );
}