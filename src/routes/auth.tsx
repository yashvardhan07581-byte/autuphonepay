import { createFileRoute, useNavigate, redirect, isRedirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye, EyeOff, Mail, Lock, User as UserIcon, Phone,
  QrCode, Zap, Shield, TrendingUp, ArrowRight, Check,
} from "lucide-react";
import { toast } from "sonner";
import { swalSuccess } from "@/lib/swal";
import logoUrl from "@/assets/panme-logo.jpg";

async function getRedirectPath(userId: string): Promise<string> {
  try {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();
    return profile?.role === "admin" ? "/admin" : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "AutoUPI | Sign In" },
      {
        name: "description",
        content: "Sign in or create your AutoUPI payment gateway account.",
      },
    ],
  }),
  beforeLoad: async () => {
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session?.user) {
        const path = await getRedirectPath(data.session.user.id);
        throw redirect({ to: path });
      }
    } catch (err) {
      if (isRedirect(err)) throw err;
    }
  },
  component: AuthPage,
});

type Mode = "login" | "register";

function AuthPage() {
  const [mode, setMode] = useState<Mode>("login");

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e8f5ee] via-[#dfeee5] to-[#cfe3d5] flex">
      {/* ============ LEFT PANEL (Desktop only) ============ */}
      <section className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0d4a3a] to-[#0a3d30] text-white p-10 xl:p-14 flex-col relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="AutoUPI"
              className="w-12 h-12 object-contain rounded-xl bg-white/10 p-1.5 backdrop-blur-sm"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-tight">AutoUPI</h1>
              <p className="text-xs text-white/60 -mt-0.5">Payment Gateway</p>
            </div>
          </div>

          {/* Headline */}
          <div className="mt-16 max-w-lg">
            <h2 className="font-serif italic text-4xl xl:text-5xl leading-tight">
              {mode === "login"
                ? "Accept UPI payments — instantly verified."
                : "Set up your gateway. Start collecting in minutes."}
            </h2>
            <p className="mt-4 text-white/75 text-base leading-relaxed">
              India's simplest UPI payment gateway for businesses of all sizes.
            </p>
          </div>

          {/* Feature grid */}
          <div className="mt-auto pt-12 grid grid-cols-2 gap-3 max-w-lg">
            {[
              { icon: QrCode, t: "Instant QR", s: "Generate in seconds" },
              { icon: Zap, t: "Auto-verify", s: "Confirmed via email" },
              { icon: TrendingUp, t: "Real-time", s: "Webhook callbacks" },
              { icon: Shield, t: "Secure", s: "Bank-grade safety" },
            ].map((f) => {
              const Icon = f.icon;
              return (
                <div
                  key={f.t}
                  className="bg-white/5 border border-white/10 rounded-xl p-4 backdrop-blur-sm hover:bg-white/10 transition"
                >
                  <Icon className="w-5 h-5 text-emerald-300 mb-2" />
                  <div className="font-bold text-sm">{f.t}</div>
                  <div className="text-xs text-white/60 mt-0.5">{f.s}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ RIGHT PANEL (Form) ============ */}
      <section className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
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

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-6 sm:p-8">
            {mode === "login" ? (
              <LoginForm onSwitch={() => setMode("register")} />
            ) : (
              <RegisterForm onSwitch={() => setMode("login")} />
            )}
          </div>

          {/* Footer note */}
          <p className="text-center text-xs text-gray-500 mt-6">
            By continuing, you agree to our{" "}
            <a className="underline font-medium hover:text-[#0d4a3a]">Terms</a> and{" "}
            <a className="underline font-medium hover:text-[#0d4a3a]">Privacy Policy</a>
          </p>
        </div>
      </section>
    </main>
  );
}

// ============ LOGIN FORM ============
function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }
    const userId = data.user?.id;
    const redirectPath = userId ? await getRedirectPath(userId) : "/dashboard";
    setLoading(false);
    await swalSuccess("Logged in successfully");
    navigate({ to: redirectPath });
  }

  async function onForgot() {
    if (!email) return toast.error("Enter your email above first");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) return toast.error(error.message);
    swalSuccess("Password reset link sent to your email");
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0d1b2a]">
          Welcome back
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Sign in to your AutoUPI account
        </p>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-[#0d1b2a] mb-1.5">
          Email address
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

      {/* Password */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-sm font-medium text-[#0d1b2a]">Password</label>
          <button
            type="button"
            onClick={onForgot}
            className="text-xs font-semibold text-[#0d4a3a] hover:underline"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPass ? "text" : "password"}
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
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

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3.5 rounded-xl bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold tracking-wide transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#0d4a3a]/20"
      >
        {loading ? "Signing in…" : (
          <>
            Sign In <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Switch */}
      <p className="text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-bold text-[#0d4a3a] hover:underline"
        >
          Create one
        </button>
      </p>
    </form>
  );
}

// ============ REGISTER FORM ============
function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) return toast.error("Please accept the Terms and Privacy Policy");
    if (!/^\d{10}$/.test(whatsapp)) return toast.error("Enter a valid 10-digit WhatsApp number");
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: name.trim(), whatsapp: `+91${whatsapp}` },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      await swalSuccess("Account created successfully");
      const userId = data.user?.id;
      const redirectPath = userId ? await getRedirectPath(userId) : "/dashboard";
      navigate({ to: redirectPath });
    } else {
      await swalSuccess("Account created — check your email to confirm.");
      onSwitch();
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0d1b2a]">
          Create account
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Start accepting UPI payments today
        </p>
      </div>

      {/* Name */}
      <div>
        <label className="block text-sm font-medium text-[#0d1b2a] mb-1.5">
          Full name
        </label>
        <div className="relative">
          <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            maxLength={80}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:border-[#0d4a3a] focus:ring-2 focus:ring-[#0d4a3a]/15 outline-none text-sm transition bg-white"
          />
        </div>
      </div>

      {/* WhatsApp */}
      <div>
        <label className="block text-sm font-medium text-[#0d1b2a] mb-1.5">
          WhatsApp number
        </label>
        <div className="flex items-stretch rounded-xl border border-gray-200 focus-within:border-[#0d4a3a] focus-within:ring-2 focus-within:ring-[#0d4a3a]/15 overflow-hidden bg-white transition">
          <span className="px-3 flex items-center bg-gray-50 border-r border-gray-200 text-[#0d1b2a] font-medium text-sm">
            +91
          </span>
          <div className="relative flex-1">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              required
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value.replace(/\D/g, "").slice(0, 10))}
              placeholder="10-digit number"
              inputMode="numeric"
              className="w-full pl-9 pr-4 py-3 outline-none text-sm bg-transparent"
            />
          </div>
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-sm font-medium text-[#0d1b2a] mb-1.5">
          Email address
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

      {/* Password */}
      <div>
        <label className="block text-sm font-medium text-[#0d1b2a] mb-1.5">
          Password
        </label>
        <div className="relative">
          <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type={showPass ? "text" : "password"}
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password (min 6 chars)"
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

      {/* Terms */}
      <label className="flex items-start gap-2.5 text-sm text-[#0d1b2a] cursor-pointer">
        <input
          type="checkbox"
          checked={agree}
          onChange={(e) => setAgree(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-[#0d4a3a] rounded"
        />
        <span className="text-xs sm:text-sm leading-relaxed">
          I agree to the{" "}
          <a className="font-semibold underline hover:text-[#0d4a3a]">Terms</a>{" "}
          and{" "}
          <a className="font-semibold underline hover:text-[#0d4a3a]">Privacy Policy</a>
        </span>
      </label>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading || !agree}
        className="w-full py-3.5 rounded-xl bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold tracking-wide transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#0d4a3a]/20"
      >
        {loading ? "Creating account…" : (
          <>
            Create Account <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>

      {/* Switch */}
      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <button
          type="button"
          onClick={onSwitch}
          className="font-bold text-[#0d4a3a] hover:underline"
        >
          Sign in
        </button>
      </p>
    </form>
  );
}