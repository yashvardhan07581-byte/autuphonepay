import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  QrCode, Zap, Shield, TrendingUp, Bell, Lock, Globe,
  Check, ArrowRight, IndianRupee, Users, BarChart3,
  Menu, X, Mail, Phone, MapPin,
} from "lucide-react";
import logoUrl from "@/assets/panme-logo.jpg";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    if (typeof window === "undefined") return;
    try {
      const { data } = await supabase.auth.getSession();
      if (data.session) throw redirect({ to: "/dashboard" });
    } catch (e) {
      if (e && typeof e === "object" && "to" in (e as any)) throw e;
    }
  },
  component: LandingPage,
});

function LandingPage() {
  const [mobileMenu, setMobileMenu] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const headerOffset = 80;
      const elementPosition = el.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offsetPosition, behavior: "smooth" });
    }
    setMobileMenu(false);
  };

  return (
    <div className="min-h-screen bg-[#0d4a3a] text-white overflow-x-hidden">
      {/* ============ NAVBAR ============ */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? "bg-[#0a3d30]/95 backdrop-blur-md shadow-lg border-b border-white/10"
            : "bg-transparent"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <img
                src={logoUrl}
                alt="AutoUPI"
                className="w-9 h-9 object-contain rounded-lg bg-white/10 p-1"
              />
              <div>
                <div className="font-bold text-lg leading-tight text-white">AutoUPI</div>
                <div className="text-[10px] text-white/60 leading-tight -mt-0.5">
                  Payment Gateway
                </div>
              </div>
            </Link>

            {/* Desktop Menu */}
            <div className="hidden md:flex items-center gap-8">
              <button
                onClick={() => scrollTo("features")}
                className="text-sm font-medium text-white/80 hover:text-white transition"
              >
                Features
              </button>
              <button
                onClick={() => scrollTo("how-it-works")}
                className="text-sm font-medium text-white/80 hover:text-white transition"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollTo("pricing")}
                className="text-sm font-medium text-white/80 hover:text-white transition"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollTo("faq")}
                className="text-sm font-medium text-white/80 hover:text-white transition"
              >
                FAQ
              </button>
              <Link
                to="/auth"
                className="text-sm font-medium text-white/80 hover:text-white transition"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-white text-[#0d4a3a] font-bold text-sm transition shadow-lg hover:bg-white/90"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            <button
              onClick={() => setMobileMenu(!mobileMenu)}
              className="md:hidden p-2 text-white"
            >
              {mobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {mobileMenu && (
            <div className="md:hidden py-4 border-t border-white/10 space-y-1">
              <button
                onClick={() => scrollTo("features")}
                className="block w-full text-left px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/5 rounded-lg"
              >
                Features
              </button>
              <button
                onClick={() => scrollTo("how-it-works")}
                className="block w-full text-left px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/5 rounded-lg"
              >
                How It Works
              </button>
              <button
                onClick={() => scrollTo("pricing")}
                className="block w-full text-left px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/5 rounded-lg"
              >
                Pricing
              </button>
              <button
                onClick={() => scrollTo("faq")}
                className="block w-full text-left px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/5 rounded-lg"
              >
                FAQ
              </button>
              <Link
                to="/auth"
                className="block w-full text-left px-4 py-2.5 text-sm font-medium text-white/90 hover:bg-white/5 rounded-lg"
              >
                Sign In
              </Link>
              <Link
                to="/auth"
                className="flex items-center justify-center gap-2 px-5 py-3 mt-2 rounded-lg bg-white text-[#0d4a3a] font-bold text-sm transition"
              >
                Get Started <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      </nav>

      {/* ============ HERO ============ */}
      <section className="relative pt-28 sm:pt-32 pb-16 sm:pb-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 border border-white/15 mb-6 backdrop-blur-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs sm:text-sm font-medium text-emerald-100">
                UPI Payments — Now Live
              </span>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight tracking-tight">
              Accept UPI Payments
              <br />
              <span className="bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                In Seconds
              </span>
            </h1>

            <p className="mt-5 sm:mt-6 text-base sm:text-lg text-white/75 max-w-2xl mx-auto leading-relaxed">
              India's simplest UPI payment gateway. Generate QR codes, accept payments via
              PhonePe, GPay, Paytm — get instant webhook notifications, all with one API key.
            </p>

            <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
              <Link
                to="/auth"
                className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-white text-[#0d4a3a] font-bold text-base transition shadow-2xl hover:bg-white/90 w-full sm:w-auto justify-center"
              >
                Start Free <ArrowRight className="w-5 h-5" />
              </Link>
              <button
                onClick={() => scrollTo("how-it-works")}
                className="inline-flex items-center gap-2 px-7 py-4 rounded-xl bg-white/10 backdrop-blur-sm border-2 border-white/20 hover:bg-white/15 text-white font-bold text-base transition w-full sm:w-auto justify-center"
              >
                See How It Works
              </button>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-white/60">
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                No setup fee
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                Instant activation
              </div>
              <div className="flex items-center gap-1.5">
                <Check className="w-4 h-4 text-emerald-400" />
                No KYC hassle
              </div>
            </div>
          </div>

          {/* Hero Stats */}
          <div className="mt-16 sm:mt-20 grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {[
              { value: "10K+", label: "Transactions" },
              { value: "500+", label: "Active Users" },
              { value: "99.9%", label: "Uptime" },
              { value: "<5s", label: "Webhook Speed" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center p-4 sm:p-6 bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10"
              >
                <div className="text-2xl sm:text-3xl font-extrabold bg-gradient-to-r from-emerald-300 to-teal-300 bg-clip-text text-transparent">
                  {stat.value}
                </div>
                <div className="text-xs sm:text-sm text-white/60 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className="text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-widest mb-3">
              Features
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
              Everything You Need
            </h2>
            <p className="text-base sm:text-lg text-white/70">
              Powerful features to help you accept payments and grow your business
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6">
            {[
              { icon: QrCode, title: "Instant QR Codes", desc: "Generate UPI QR codes for any amount in seconds. Share via WhatsApp, email, or link." },
              { icon: Zap, title: "Real-Time Webhooks", desc: "Get notified instantly when payment is received. Signature-verified for security." },
              { icon: Shield, title: "Bank-Grade Security", desc: "HMAC-SHA256 signatures, encrypted keys, and industry-standard security practices." },
              { icon: TrendingUp, title: "Auto Verification", desc: "Payments auto-verified via email parsing. No manual work, no missed transactions." },
              { icon: Bell, title: "Email Notifications", desc: "Automatic subscription reminders and payment alerts to your customers." },
              { icon: BarChart3, title: "Analytics Dashboard", desc: "Track total revenue, orders, and customer activity in a beautiful dashboard." },
              { icon: Lock, title: "API Key Management", desc: "Rotate keys, manage webhooks, and control access with a simple dashboard." },
              { icon: Globe, title: "Custom Domain", desc: "Use your own domain for payment pages. Full white-label support." },
              { icon: Users, title: "Multi-User Support", desc: "Each merchant gets their own dashboard, API keys, and settings." },
            ].map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="group bg-white/5 backdrop-blur-sm rounded-2xl p-5 sm:p-6 border border-white/10 hover:border-emerald-400/40 hover:bg-white/10 transition-all duration-300"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg mb-4 group-hover:scale-110 transition-transform">
                    <Icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-white mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">{feature.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ HOW IT WORKS ============ */}
      <section id="how-it-works" className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className="text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-widest mb-3">
              How It Works
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
              Start in 3 Simple Steps
            </h2>
            <p className="text-base sm:text-lg text-white/70">
              From signup to first payment in under 5 minutes
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            {[
              { num: "01", title: "Sign Up Free", desc: "Create your account in 30 seconds. No credit card required.", icon: Users },
              { num: "02", title: "Get API Key", desc: "Copy your API key from dashboard. Configure webhook URL.", icon: Lock },
              { num: "03", title: "Accept Payments", desc: "Integrate the API, generate QR codes, and start accepting payments.", icon: IndianRupee },
            ].map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.num}
                  className="relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border border-white/10 hover:border-emerald-400/40 transition-all"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center shadow-lg">
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <div className="text-4xl font-extrabold text-white/10">{step.num}</div>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white mb-2">
                    {step.title}
                  </h3>
                  <p className="text-sm text-white/60 leading-relaxed">{step.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12 sm:mb-16">
            <div className="text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-widest mb-3">
              Pricing
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-base sm:text-lg text-white/70">
              Choose the plan that fits your business. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 max-w-5xl mx-auto">
            {/* Basic */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border-2 border-white/10 hover:border-blue-400/50 transition-all flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-md mb-4">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Basic</h3>
              <p className="text-sm text-white/60 mt-1">Perfect for starters</p>
              <div className="mt-5 mb-6">
                <span className="text-4xl font-extrabold text-white">₹99</span>
                <span className="text-white/60 text-sm ml-1">/ 30 days</span>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {[
                  "1,000 payment orders/month",
                  "Basic webhook support",
                  "Email notifications",
                  "Standard support",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/75">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-blue-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-sm transition text-center"
              >
                Get Started
              </Link>
            </div>

            {/* Pro - Popular */}
            <div className="bg-gradient-to-br from-emerald-500/20 to-teal-500/10 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border-2 border-emerald-400/40 shadow-2xl relative flex flex-col md:scale-105">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold shadow-lg">
                  MOST POPULAR
                </span>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-md mb-4">
                <TrendingUp className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Pro</h3>
              <p className="text-sm text-white/60 mt-1">For growing businesses</p>
              <div className="mt-5 mb-6">
                <span className="text-4xl font-extrabold text-white">₹299</span>
                <span className="text-white/60 text-sm ml-1">/ 60 days</span>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {[
                  "10,000 payment orders/month",
                  "Priority webhook delivery",
                  "Custom domain support",
                  "Email + Chat support",
                  "Advanced analytics",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/85">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="w-full py-3.5 rounded-xl bg-white text-[#0d4a3a] font-bold text-sm transition text-center hover:bg-white/90"
              >
                Get Started
              </Link>
            </div>

            {/* Yearly */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 sm:p-8 border-2 border-white/10 hover:border-emerald-400/50 transition-all flex flex-col">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-md mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white">Yearly</h3>
              <p className="text-sm text-white/60 mt-1">Best value for money</p>
              <div className="mt-5 mb-6">
                <span className="text-4xl font-extrabold text-white">₹999</span>
                <span className="text-white/60 text-sm ml-1">/ 200 days</span>
              </div>
              <ul className="space-y-3 flex-1 mb-6">
                {[
                  "Unlimited payment orders",
                  "Priority webhook delivery",
                  "Custom domain support",
                  "24/7 Priority support",
                  "Advanced analytics",
                  "Early access to features",
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-white/75">
                    <Check className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link
                to="/auth"
                className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-sm transition text-center"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" className="py-16 sm:py-24 relative">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12 sm:mb-16">
            <div className="text-xs sm:text-sm font-bold text-emerald-300 uppercase tracking-widest mb-3">
              FAQ
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
              Frequently Asked Questions
            </h2>
            <p className="text-base sm:text-lg text-white/70">
              Everything you need to know about AutoUPI
            </p>
          </div>

          <div className="space-y-3">
            {[
              { q: "How do I start accepting payments?", a: "Sign up for a free account, choose a subscription plan, and you'll get your API key instantly. Then integrate our simple API or use our dashboard to generate QR codes." },
              { q: "What payment methods are supported?", a: "We support all UPI payment methods including PhonePe, Google Pay, Paytm, BHIM, and any other UPI-enabled app." },
              { q: "How fast are payments verified?", a: "Payments are typically verified within 5-30 seconds via our email parsing technology. You'll receive a webhook notification the moment payment is confirmed." },
              { q: "Do I need KYC to start?", a: "No KYC required to start! You can begin accepting payments immediately after signing up." },
              { q: "Is there a setup fee?", a: "No setup fees, no hidden charges. You only pay for the subscription plan you choose. Cancel anytime from your dashboard." },
              { q: "Can I use my own domain?", a: "Yes! Pro and Yearly plans support custom domains. Your customers will see your own branded payment page." },
              { q: "What happens if my subscription expires?", a: "Your account and data remain safe. You just won't be able to create new orders until you renew." },
              { q: "How do I get support?", a: "Email support is available on all plans. Pro and Yearly plans get priority support via email and chat." },
            ].map((faq, i) => (
              <details
                key={i}
                className="group bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 hover:border-emerald-400/40 transition-all overflow-hidden"
              >
                <summary className="flex items-center justify-between gap-3 p-5 sm:p-6 cursor-pointer list-none">
                  <span className="font-semibold text-sm sm:text-base text-white pr-2">
                    {faq.q}
                  </span>
                  <span className="shrink-0 w-6 h-6 rounded-full bg-white/10 border border-white/20 flex items-center justify-center group-open:rotate-45 transition-transform">
                    <span className="text-emerald-300 font-bold text-lg leading-none">+</span>
                  </span>
                </summary>
                <div className="px-5 sm:px-6 pb-5 sm:pb-6 text-sm text-white/70 leading-relaxed">
                  {faq.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CTA ============ */}
      <section className="py-16 sm:py-24 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="rounded-3xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border-2 border-emerald-400/30 p-8 sm:p-12 lg:p-16 text-center shadow-2xl relative overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-emerald-400 rounded-full blur-3xl" />
              <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-emerald-400 rounded-full blur-3xl" />
            </div>
            <div className="relative">
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-white mb-4">
                Ready to Start Accepting UPI?
              </h2>
              <p className="text-base sm:text-lg text-white/75 mb-8 max-w-2xl mx-auto">
                Join hundreds of businesses using AutoUPI to accept payments. Start in
                under 5 minutes.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center">
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white text-[#0d4a3a] font-bold text-base transition shadow-xl hover:bg-white/90 w-full sm:w-auto justify-center"
                >
                  Get Started Free <ArrowRight className="w-5 h-5" />
                </Link>
                <Link
                  to="/docs"
                  className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 font-bold text-base transition backdrop-blur-sm w-full sm:w-auto justify-center"
                >
                  View Documentation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="bg-[#0a3d30] border-t border-white/10 text-white pt-12 sm:pt-16 pb-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10 pb-10 border-b border-white/10">
            {/* Brand */}
            <div className="lg:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <img
                  src={logoUrl}
                  alt="AutoUPI"
                  className="w-9 h-9 object-contain rounded-lg bg-white/10 p-1"
                />
                <div>
                  <div className="font-bold text-lg leading-tight">AutoUPI</div>
                  <div className="text-[10px] text-white/50 leading-tight -mt-0.5">
                    Payment Gateway
                  </div>
                </div>
              </div>
              <p className="text-sm text-white/60 leading-relaxed">
                India's simplest UPI payment gateway for businesses of all sizes.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest text-white/80 mb-4">
                Product
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <button
                    onClick={() => scrollTo("features")}
                    className="text-white/60 hover:text-white transition"
                  >
                    Features
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => scrollTo("pricing")}
                    className="text-white/60 hover:text-white transition"
                  >
                    Pricing
                  </button>
                </li>
                <li>
                  <Link to="/docs" className="text-white/60 hover:text-white transition">
                    Documentation
                  </Link>
                </li>
                <li>
                  <Link to="/auth" className="text-white/60 hover:text-white transition">
                    Sign In
                  </Link>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest text-white/80 mb-4">
                Company
              </h4>
              <ul className="space-y-2.5 text-sm">
                <li>
                  <a href="#" className="text-white/60 hover:text-white transition">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/60 hover:text-white transition">
                    Contact
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/60 hover:text-white transition">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="#" className="text-white/60 hover:text-white transition">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div>
              <h4 className="font-bold text-sm uppercase tracking-widest text-white/80 mb-4">
                Contact
              </h4>
              <ul className="space-y-3 text-sm">
                <li className="flex items-center gap-2 text-white/60">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span>princeinfotech5001@gmail.com</span>
                </li>
                <li className="flex items-center gap-2 text-white/60">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>+91 99317 70622</span>
                </li>
                <li className="flex items-start gap-2 text-white/60">
                  <MapPin className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>India</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-white/50">
              © {new Date().getFullYear()} AutoUPI. All rights reserved.
            </div>
            <div className="text-xs text-white/50">
              Made with <span className="text-red-400">♥</span> in India
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}