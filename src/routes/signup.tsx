import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Eye, EyeOff, Mail, Lock, User as UserIcon, Phone,
  QrCode, Zap, Shield, TrendingUp, ArrowRight, Check,
  Sparkles, Users as UsersIcon, Rocket,
} from "lucide-react";
import { toast } from "sonner";
import { swalSuccess } from "@/lib/swal";
import logoUrl from "@/assets/panme-logo.jpg";

export const Route = createFileRoute("/signup")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "AutoUPI | Create Account" },
      { name: "description", content: "Create your AutoUPI payment gateway account. Start accepting UPI payments in under 5 minutes." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [agree, setAgree] = useState(true);
  const [loading, setLoading] = useState(false);

  const passwordStrength = () => {
    if (password.length < 6) return { label: "Too short", color: "bg-red-500", width: "20%" };
    if (password.length < 8) return { label: "Weak", color: "bg-orange-500", width: "40%" };
    if (password.length < 12) return { label: "Good", color: "bg-yellow-500", width: "70%" };
    return { label: "Strong", color: "bg-emerald-500", width: "100%" };
  };

  async function signup(e: React.FormEvent) {
    e.preventDefault();
    if (!agree) return toast.error("Please accept the Terms and Privacy Policy");
    if (!/^\d{10}$/.test(whatsapp)) return toast.error("Enter a valid 10-digit WhatsApp number");
    if (password.length < 6) return toast.error("Password must be at least 6 characters");

    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
        data: { display_name: name.trim(), whatsapp: `+91${whatsapp}` },
      },
    });

    if (error) {
      setLoading(false);
      return toast.error(error.message);
    }

    if (data.session) {
      await swalSuccess("Account created successfully");
      navigate({ to: "/dashboard" });
    } else {
      await swalSuccess("Account created — check your email to confirm.");
      navigate({ to: "/auth" });
    }
    setLoading(false);
  }

  const strength = passwordStrength();

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#e8f5ee] via-[#dfeee5] to-[#cfe3d5] flex">
      {/* ============ LEFT PANEL (Desktop) ============ */}
      <section className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#0d4a3a] to-[#0a3d30] text-white p-10 xl:p-14 flex-col relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-white rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 flex flex-col h-full">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3">
            <img
              src={logoUrl}
              alt="AutoUPI"
              className="w-12 h-12 object-contain rounded-xl bg-white/10 p-1.5 backdrop-blur-sm"
            />
            <div>
              <h1 className="text-2xl font-bold tracking-tight leading-tight">AutoUPI</h1>
              <p className="text-xs text-white/60 -mt-0.5">Payment Gateway</p>
            </div>
          </Link>

          {/* Headline */}
          <div className="mt-12 max-w-lg">
            <h2 className="font-serif italic text-4xl xl:text-5xl leading-tight">
              Start accepting payments in under 5 minutes.
            </h2>
            <p className="mt-4 text-white/75 text-base leading-relaxed">
              Join hundreds of businesses using AutoUPI to accept UPI payments.
            </p>
          </div>

          {/* Features */}
          <div className="mt-auto pt-10 grid grid-cols-2 gap-3 max-w-lg">
            {[
              { icon: Sparkles, t: "Free Setup", s: "No signup fee" },
              { icon: Rocket, t: "5 Minutes", s: "Signup to first pay" },
              { icon: UsersIcon, t: "Multi-User", s: "Team-friendly" },
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

          {/* Testimonial */}
          <div className="mt-6 max-w-lg p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-1 mb-2">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-amber-300 text-sm">★</span>
              ))}
            </div>
            <p className="text-sm text-white/75 italic">
              "Setup was super easy. Had my first payment in less than 10 minutes."
            </p>
            <p className="text-xs text-white/50 mt-2">— Prince, PrintSoftTech</p>
          </div>
        </div>
      </section>

      {/* ============ RIGHT PANEL (Form) ============ */}
      <section className="flex-1 flex items-center justify-center p-5 sm:p-8 lg:p-12">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8">
            <Link to="/" className="flex items-center gap-3">
              <img
                src={logoUrl}
                alt="AutoUPI"
                className="w-11 h-11 object-contain rounded-xl bg-[#0d4a3a] p-1.5"
              />
              <div>
                <div className="text-xl font-bold text-[#0d4a3a]">AutoUPI</div>
                <div className="text-[10px] text-gray-500 -mt-0.5">Payment Gateway</div>
              </div>
            </Link>
          </div>

          {/* Form card */}
          <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-6 sm:p-8">
            <form onSubmit={signup} className="space-y-4">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 mb-3">
                  <Sparkles className="w-3 h-3 text-emerald-600" />
                  <span className="text-[10px] sm:text-xs font-bold text-emerald-700 uppercase tracking-wider">
                    Free Forever Plan
                  </span>
                </div>
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
                <p className="text-xs text-gray-500 mt-1.5">
                  Used for payment alerts & support
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

                {/* Password strength */}
                {password.length > 0 && (
                  <div className="mt-2">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${strength.color} transition-all duration-300`}
                          style={{ width: strength.width }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600 w-16 text-right">
                        {strength.label}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Terms */}
              <label className="flex items-start gap-2.5 text-sm text-[#0d1b2a] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={agree}
                  onChange={(e) => setAgree(e.target.checked)}
                  className="mt-0.5 w-4 h-4 accent-[#0d4a3a] rounded shrink-0"
                />
                <span className="text-xs sm:text-sm leading-relaxed">
                  I agree to the{" "}
                  <a className="font-semibold underline hover:text-[#0d4a3a]">Terms</a> and{" "}
                  <a className="font-semibold underline hover:text-[#0d4a3a]">Privacy Policy</a>
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || !agree}
                className="w-full py-3.5 rounded-xl bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold tracking-wide transition disabled:opacity-60 flex items-center justify-center gap-2 shadow-lg shadow-[#0d4a3a]/20"
              >
                {loading ? (
                  "Creating account…"
                ) : (
                  <>
                    Create Account <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Trust badges */}
              <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-3 border-t border-gray-100">
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  No credit card
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Free forever
                </div>
                <div className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Check className="w-3.5 h-3.5 text-emerald-500" />
                  Cancel anytime
                </div>
              </div>

              {/* Switch to login */}
              <p className="text-center text-sm text-gray-600">
                Already have an account?{" "}
                <Link
                  to="/auth"
                  className="font-bold text-[#0d4a3a] hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </div>

          {/* Footer */}
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