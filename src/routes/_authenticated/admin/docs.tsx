import { createFileRoute, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  BookOpen, ChevronDown, Database, CreditCard, DollarSign,
  Mail, Users, Settings, Shield, Zap, FileText,
  Bell, Code, CheckCircle2, AlertCircle, Info,
  Copy, Check, Rocket,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/docs")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") throw redirect({ to: "/dashboard" });
    return { user };
  },
  component: AdminDocs,
});

type SectionType = {
  id: string;
  title: string;
  icon: any;
};

const SECTIONS: SectionType[] = [
  { id: "intro", title: "1. Introduction", icon: BookOpen },
  { id: "setup", title: "2. First Time Setup", icon: Rocket },
  { id: "supabase", title: "3. Supabase Setup", icon: Database },
  { id: "gateway", title: "4. Gateway Configuration", icon: CreditCard },
  { id: "gmail", title: "5. Gmail SMTP Setup", icon: Mail },
  { id: "pricing", title: "6. Subscription Plans & Pricing", icon: DollarSign },
  { id: "api", title: "7. API Integration", icon: Code },
  { id: "webhook", title: "8. Webhook Setup", icon: Zap },
  { id: "users", title: "9. User Management", icon: Users },
  { id: "email", title: "10. Email System", icon: Bell },
  { id: "customize", title: "11. Customization Guide", icon: Settings },
  { id: "troubleshoot", title: "12. Troubleshooting", icon: AlertCircle },
];

function AdminDocs() {
  const [activeSection, setActiveSection] = useState("intro");
  const [copied, setCopied] = useState<string | null>(null);

  const scrollToSection = (id: string) => {
    setActiveSection(id);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const copyCode = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d4a3a] to-[#1b6e54] shadow-xl p-5 sm:p-6 mb-6">
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/15 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-3xl font-bold text-white truncate">
              Admin Documentation
            </h1>
            <p className="text-xs sm:text-sm text-emerald-100/90 mt-0.5">
              Complete setup guide — step by step
            </p>
          </div>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 sm:p-5 mb-6 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="text-sm text-blue-800">
          <p className="font-semibold mb-1">Beginner-Friendly Guide</p>
          <p className="text-xs sm:text-sm leading-relaxed">
            This guide assumes zero technical knowledge. Follow step-by-step from top to bottom.
            Every command, every click, and every file change is explained in detail.
          </p>
        </div>
      </div>

      {/* Layout */}
      <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
        {/* Sidebar */}
        <aside className="lg:sticky lg:top-6 lg:self-start lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto mb-6 lg:mb-0">
          <div className="bg-white rounded-2xl shadow-lg border border-black/5 p-3">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-widest px-3 py-2">
              Contents
            </div>
            <nav className="space-y-1">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const active = activeSection === s.id;
                return (
                  <button
                    key={s.id}
                    onClick={() => scrollToSection(s.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs sm:text-sm transition ${
                      active
                        ? "bg-[#0d4a3a]/10 text-[#0d4a3a] font-semibold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{s.title}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Content */}
        <article className="space-y-6 min-w-0">
          {/* ============ 1. INTRODUCTION ============ */}
          <Section id="intro" title="1. Introduction" icon={BookOpen}>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              Welcome to <strong>AutoUPI Payment Gateway</strong> — a complete UPI payment
              solution for businesses. This documentation will guide you through everything
              from initial setup to advanced customization.
            </p>

            <h3 className="font-bold text-base sm:text-lg text-[#0d1b2a] mt-6 mb-3">
              What is AutoUPI?
            </h3>
            <p className="text-sm text-gray-700 leading-relaxed">
              AutoUPI is a self-hosted UPI payment gateway that:
            </p>
            <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-700 ml-2 mt-2">
              <li>Generates UPI QR codes for any amount</li>
              <li>Automatically verifies payments via email parsing</li>
              <li>Sends webhook notifications to your server</li>
              <li>Manages user subscriptions</li>
              <li>Provides a beautiful dashboard for both admin and users</li>
            </ul>

            <h3 className="font-bold text-base sm:text-lg text-[#0d1b2a] mt-6 mb-3">
              Tech Stack
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Frontend", value: "React + TanStack Router" },
                { label: "Backend", value: "Node.js + Vite" },
                { label: "Database", value: "Supabase (PostgreSQL)" },
                { label: "Hosting", value: "Vercel" },
                { label: "Email", value: "Gmail SMTP" },
                { label: "Payment", value: "UPI (PhonePe/GPay/Paytm)" },
              ].map((t) => (
                <div key={t.label} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg p-3">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <div>
                    <span className="font-semibold text-[#0d1b2a]">{t.label}: </span>
                    <span className="text-gray-600">{t.value}</span>
                  </div>
                </div>
              ))}
            </div>
          </Section>

          {/* ============ 2. FIRST TIME SETUP ============ */}
          <Section id="setup" title="2. First Time Setup" icon={Rocket}>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              Follow these steps if you're setting up AutoUPI for the first time.
              Total time: ~30 minutes.
            </p>

            <Step num={1} title="Create Accounts">
              <p className="text-sm text-gray-700 mb-3">
                You'll need accounts on these platforms (all free):
              </p>
              <ul className="space-y-2 text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Supabase</strong> — for database & auth —{" "}
                    <a href="https://supabase.com" target="_blank" rel="noopener" className="text-[#0d4a3a] underline">
                      supabase.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Vercel</strong> — for hosting —{" "}
                    <a href="https://vercel.com" target="_blank" rel="noopener" className="text-[#0d4a3a] underline">
                      vercel.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>GitHub</strong> — for code —{" "}
                    <a href="https://github.com" target="_blank" rel="noopener" className="text-[#0d4a3a] underline">
                      github.com
                    </a>
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>Gmail</strong> — for sending emails — free Gmail account
                  </div>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <div>
                    <strong>PhonePe Business</strong> — for receiving payments
                  </div>
                </li>
              </ul>
            </Step>

            <Step num={2} title="Clone the Code">
              <p className="text-sm text-gray-700 mb-2">Open terminal/CMD and run:</p>
              <CodeBlock
                code={`git clone https://github.com/yashvardhan07581-byte/autuphonepay.git
cd autuphonepay`}
                onCopy={(c) => copyCode(c, "clone")}
                copied={copied === "clone"}
              />
            </Step>

            <Step num={3} title="Install Dependencies">
              <CodeBlock
                code={`npm install --legacy-peer-deps`}
                onCopy={(c) => copyCode(c, "install")}
                copied={copied === "install"}
              />
            </Step>

            <Step num={4} title="Set up Environment Variables">
              <p className="text-sm text-gray-700 mb-2">
                Create a file called <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">.env</code>{" "}
                in the project root folder with these values:
              </p>
              <CodeBlock
                code={`SUPABASE_URL="https://your-project.supabase.co"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
VITE_SUPABASE_URL="https://your-project.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"`}
                onCopy={(c) => copyCode(c, "env")}
                copied={copied === "env"}
              />
              <p className="text-xs text-gray-600 mt-2">
                ⚠️ Values will be different for your project — see Supabase Setup section.
              </p>
            </Step>

            <Step num={5} title="Run Locally">
              <CodeBlock
                code={`npm run dev`}
                onCopy={(c) => copyCode(c, "dev")}
                copied={copied === "dev"}
              />
              <p className="text-sm text-gray-700 mt-2">
                Open <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">http://localhost:8080</code>{" "}
                in browser. You should see the login page.
              </p>
            </Step>
          </Section>

          {/* ============ 3. SUPABASE SETUP ============ */}
          <Section id="supabase" title="3. Supabase Setup" icon={Database}>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              Supabase provides database + authentication. Here's how to set it up.
            </p>

            <Step num={1} title="Create a Project">
              <ul className="list-decimal list-inside space-y-1.5 text-sm text-gray-700 ml-2">
                <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener" className="text-[#0d4a3a] underline">supabase.com/dashboard</a></li>
                <li>Click <strong>"New Project"</strong></li>
                <li>Choose a name (e.g., "autoupi")</li>
                <li>Set a strong <strong>database password</strong> (save it!)</li>
                <li>Select your region (Mumbai for India)</li>
                <li>Wait 2 minutes for project setup</li>
              </ul>
            </Step>

            <Step num={2} title="Get API Keys">
              <p className="text-sm text-gray-700 mb-2">
                After project creation, go to <strong>Settings → API Keys</strong>. Copy:
              </p>
              <ul className="list-disc list-inside space-y-1.5 text-sm text-gray-700 ml-2">
                <li><strong>Project URL</strong> (e.g., https://xyz.supabase.co)</li>
                <li><strong>Publishable key</strong> (starts with sb_publishable_)</li>
                <li><strong>Secret key</strong> (starts with sb_secret_)</li>
              </ul>
            </Step>

            <Step num={3} title="Run Database Setup">
              <p className="text-sm text-gray-700 mb-2">
                In Supabase, go to <strong>SQL Editor</strong> and run these commands
                one by one:
              </p>
              <div className="space-y-3">
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Enable Extensions:</p>
                  <CodeBlock
                    code={`CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;`}
                    onCopy={(c) => copyCode(c, "ext")}
                    copied={copied === "ext"}
                  />
                </div>
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Create Tables:</p>
                  <p className="text-xs text-gray-500 italic">
                    Copy the full SQL from the project's <code>install/autoupi-full-database.sql</code> file
                  </p>
                </div>
              </div>
            </Step>

            <Step num={4} title="Configure Authentication">
              <ul className="list-decimal list-inside space-y-1.5 text-sm text-gray-700 ml-2">
                <li>Go to <strong>Authentication → URL Configuration</strong></li>
                <li>Set <strong>Site URL</strong>: your Vercel domain</li>
                <li>Add <strong>Redirect URLs</strong>: https://your-app.vercel.app/**</li>
                <li>Go to <strong>Providers → Email</strong></li>
                <li>Enable <strong>"Allow new users to sign up"</strong></li>
                <li>Disable <strong>"Confirm email"</strong> (for testing)</li>
              </ul>
            </Step>

            <Step num={5} title="Setup Cron Jobs">
              <CodeBlock
                code={`-- Daily purge at midnight IST
SELECT cron.schedule(
  'purge-daily-data-midnight-ist',
  '30 18 * * *',
  $$SELECT public.purge_daily_data();$$
);

-- Expire subscriptions every hour
SELECT cron.schedule(
  'expire-subscriptions',
  '0 * * * *',
  $$SELECT public.expire_subscriptions();$$
);

-- Dispatch webhooks every minute
SELECT cron.schedule(
  'dispatch-webhooks',
  '* * * * *',
  $$
  SELECT net.http_post(
    url := 'https://your-app.vercel.app/api/public/v1/internal/dispatch-webhooks',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);`}
                onCopy={(c) => copyCode(c, "cron")}
                copied={copied === "cron"}
              />
            </Step>
          </Section>

          {/* ============ 4. GATEWAY CONFIG ============ */}
          <Section id="gateway" title="4. Gateway Configuration" icon={CreditCard}>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              Configure your UPI payment gateway settings from the admin panel.
            </p>

            <Step num={1} title="Access Admin Settings">
              <ul className="list-decimal list-inside space-y-1.5 text-sm text-gray-700 ml-2">
                <li>Login as admin</li>
                <li>Go to <strong>Admin Panel → Gateway</strong></li>
                <li>Or directly visit: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">/admin/settings</code></li>
              </ul>
            </Step>

            <Step num={2} title="Fill in Gateway Settings">
              <div className="space-y-3 mt-2">
                <FieldInfo
                  label="Gateway API Key"
                  description="Your AutoUPI API key (starts with lk_live_)."
                  example="lk_live_2b74b1ba933240e6c785adae54528a764d51d1385c286daf"
                />
                <FieldInfo
                  label="Webhook Secret"
                  description="Secret for HMAC signature verification."
                  example="whsec_aef18b0688691718c14df91d5fac2392834dd93602bbdfcf"
                />
                <FieldInfo
                  label="Subscription UPI ID"
                  description="Where subscription payments will be received."
                  example="Q097259628@ybl"
                />
                <FieldInfo
                  label="Payee Name"
                  description="Business name shown to customers on payment page."
                  example="PrintSoftTech"
                />
                <FieldInfo
                  label="Gateway Base URL"
                  description="Your deployed gateway URL."
                  example="https://ccavanue.cloud"
                />
              </div>
            </Step>
          </Section>

          {/* ============ 5. GMAIL SMTP ============ */}
          <Section id="gmail" title="5. Gmail SMTP Setup" icon={Mail}>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              For sending emails (payment notifications, subscription reminders) via Gmail.
            </p>

            <Step num={1} title="Enable 2-Step Verification">
              <ul className="list-decimal list-inside space-y-1.5 text-sm text-gray-700 ml-2">
                <li>Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener" className="text-[#0d4a3a] underline">Google Account → Security</a></li>
                <li>Enable <strong>"2-Step Verification"</strong></li>
                <li>Verify your phone number</li>
              </ul>
            </Step>

            <Step num={2} title="Generate App Password">
              <ul className="list-decimal list-inside space-y-1.5 text-sm text-gray-700 ml-2">
                <li>Go to <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener" className="text-[#0d4a3a] underline">myaccount.google.com/apppasswords</a></li>
                <li>App name: <strong>"AutoUPI"</strong></li>
                <li>Click <strong>"Create"</strong></li>
                <li>Copy the 16-character password</li>
              </ul>
              <div className="mt-3 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <strong>Important:</strong> This is NOT your Gmail password. It's a special App Password.
                </div>
              </div>
            </Step>

            <Step num={3} title="Save in Admin Settings">
              <ul className="list-decimal list-inside space-y-1.5 text-sm text-gray-700 ml-2">
                <li>Go to <strong>Admin → Gateway Settings</strong></li>
                <li>Scroll to <strong>"Gmail SMTP"</strong> section</li>
                <li>Enter your <strong>Gmail address</strong></li>
                <li>Enter the <strong>App Password</strong></li>
                <li>Click <strong>"Save All Settings"</strong></li>
              </ul>
            </Step>
          </Section>

          {/* ============ 6. PRICING ============ */}
          <Section id="pricing" title="6. Subscription Plans & Pricing" icon={DollarSign}>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              Change subscription prices. Prices are defined in <strong>3 files</strong>. Update all three!
            </p>

            <PlanFile
              file="src/routes/_authenticated/subscription.tsx"
              description="Frontend — user-facing subscription page"
              code={`const PLANS: Plan[] = [
  { id: "basic", name: "Basic", price: 99, days: 30 },
  { id: "pro", name: "Pro", price: 299, days: 60 },
  { id: "yearly", name: "Yearly", price: 999, days: 200 },
];`}
              onCopy={(c) => copyCode(c, "price1")}
              copied={copied === "price1"}
            />

            <PlanFile
              file="src/lib/subscription.functions.ts"
              description="Backend — actual gateway order amount"
              code={`const PLANS = {
  basic: { price: 99, days: 30 },
  pro: { price: 299, days: 60 },
  yearly: { price: 999, days: 200 },
} as const;`}
              onCopy={(c) => copyCode(c, "price2")}
              copied={copied === "price2"}
            />

            <PlanFile
              file="src/routes/_authenticated/admin/users.$id.tsx"
              description="Admin — manual user plan assignment"
              code={`<option value="basic">Basic — ₹99 / 30 days</option>
<option value="pro">Pro — ₹299 / 60 days</option>
<option value="yearly">Yearly — ₹999 / 200 days</option>`}
              onCopy={(c) => copyCode(c, "price3")}
              copied={copied === "price3"}
            />

            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2 mt-4">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <strong>Important:</strong> Update all 3 files. If you only update the frontend,
                the gateway will charge the old amount.
              </div>
            </div>
          </Section>

          {/* ============ 7. API ============ */}
          <Section id="api" title="7. API Integration" icon={Code}>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              For merchants who want to integrate programmatically.
            </p>

            <h3 className="font-bold text-base sm:text-lg text-[#0d1b2a] mt-4 mb-3">
              Authentication
            </h3>
            <CodeBlock
              code={`Authorization: Bearer <YOUR_API_KEY>`}
              onCopy={(c) => copyCode(c, "auth")}
              copied={copied === "auth"}
            />

            <h3 className="font-bold text-base sm:text-lg text-[#0d1b2a] mt-6 mb-3">
              Create Order
            </h3>
            <CodeBlock
              code={`curl -X POST https://your-domain.com/api/public/v1/orders \\
  -H "Authorization: Bearer <API_KEY>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": 100,
    "merchant_order_id": "order_12345",
    "success_url": "https://your-site.com/success",
    "failure_url": "https://your-site.com/failed",
    "webhook_url": "https://your-site.com/webhook"
  }'`}
              onCopy={(c) => copyCode(c, "order")}
              copied={copied === "order"}
            />

            <h3 className="font-bold text-base sm:text-lg text-[#0d1b2a] mt-6 mb-3">
              Response
            </h3>
            <CodeBlock
              code={`{
  "order_id": "PRINCESOFTTECH-1234567890",
  "payable_amount": 100.07,
  "status": "pending",
  "expires_at": "2026-09-19T17:30:00.000Z",
  "payment_url": "https://your-domain.com/pay/PRINCESOFTTECH-1234567890",
  "upi_uri": "upi://pay?pa=...&am=100.07&cu=INR&tn=...",
  "qr_base64": "data:image/svg+xml;base64,..."
}`}
              onCopy={(c) => copyCode(c, "response")}
              copied={copied === "response"}
            />
          </Section>

          {/* ============ 8. WEBHOOK ============ */}
          <Section id="webhook" title="8. Webhook Setup" icon={Zap}>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              Webhooks notify your server when payment status changes.
            </p>

            <h3 className="font-bold text-base sm:text-lg text-[#0d1b2a] mt-4 mb-3">
              Webhook Body (payment.success)
            </h3>
            <CodeBlock
              code={`{
  "event": "payment.success",
  "order_id": "PRINCESOFTTECH-1234567890",
  "merchant_order_id": "order_12345",
  "amount": 100,
  "payable_amount": 100.07,
  "paid_at": "2026-09-19T17:26:01.000Z",
  "payer_email": "no-reply@paytm.com",
  "attempt": 1
}`}
              onCopy={(c) => copyCode(c, "webhook-body")}
              copied={copied === "webhook-body"}
            />

            <h3 className="font-bold text-base sm:text-lg text-[#0d1b2a] mt-6 mb-3">
              Verify Signature (Node.js)
            </h3>
            <CodeBlock
              code={`import { createHmac, timingSafeEqual } from "crypto";

const raw = await req.text();
const sig = req.headers.get("x-signature") ?? "";
const [tPart, vPart] = sig.split(",");
const t = tPart.split("=")[1];
const v1 = vPart.split("=")[1];

const expected = createHmac("sha256", process.env.WEBHOOK_SECRET)
  .update(\`\${t}.\${raw}\`)
  .digest("hex");

// Compare & process...`}
              onCopy={(c) => copyCode(c, "verify")}
              copied={copied === "verify"}
            />
          </Section>

          {/* ============ 9. USERS ============ */}
          <Section id="users" title="9. User Management" icon={Users}>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              Manage users from the Admin panel.
            </p>

            <div className="space-y-3 mt-4">
              <ActionItem title="Add New User" description="Admin → Users → Add User button." />
              <ActionItem title="View User Details" description="Click 'View' on any user." />
              <ActionItem title="Change User Role" description="Change Role from User to Admin." />
              <ActionItem title="Verify User" description="Toggle the Verified User switch." />
              <ActionItem title="Change Subscription" description="Select plan and expiry date." />
              <ActionItem title="Direct Password Change" description="Set new password without email." />
              <ActionItem title="Send Password Reset" description="User receives an email with reset link." />
              <ActionItem title="Send Reminder" description="Send Expiring or Expired email reminder." />
              <ActionItem title="Delete User" description="Permanently removes user and all data." />
            </div>
          </Section>

          {/* ============ 10. EMAIL ============ */}
          <Section id="email" title="10. Email System" icon={Bell}>
            <h3 className="font-bold text-base sm:text-lg text-[#0d1b2a] mb-3">
              Types of Emails
            </h3>
            <div className="space-y-3">
              <ActionItem title="Payment Success" description="Sent when payment received." />
              <ActionItem title="Subscription Reminder (Expiring)" description="Before expiry." />
              <ActionItem title="Subscription Reminder (Expired)" description="After expiry." />
              <ActionItem title="Password Reset" description="Standard Supabase auth email." />
            </div>

            <h3 className="font-bold text-base sm:text-lg text-[#0d1b2a] mt-6 mb-3">
              Customize Templates
            </h3>
            <p className="text-sm text-gray-700 mb-2">
              Edit email HTML in: <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs">src/lib/gmail.functions.ts</code>
            </p>
          </Section>

          {/* ============ 11. CUSTOMIZE ============ */}
          <Section id="customize" title="11. Customization Guide" icon={Settings}>
            <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
              Common customizations and where to make them.
            </p>
            <CustomizeTable />
          </Section>

          {/* ============ 12. TROUBLESHOOT ============ */}
          <Section id="troubleshoot" title="12. Troubleshooting" icon={AlertCircle}>
            <div className="space-y-3">
              <TroubleshootItem
                problem="Blank page / App won't load"
                solution="Check Vercel logs. Likely missing environment variable. Go to Vercel → Settings → Environment Variables and verify SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set."
              />
              <TroubleshootItem
                problem="Login fails with 'Invalid credentials'"
                solution="Make sure email is verified. Check Supabase → Authentication → Users to see if user exists."
              />
              <TroubleshootItem
                problem="Payment not detected"
                solution="Check Gmail IMAP connection. Go to Settings → Email and click 'Check Status'. Also verify PhonePe Business email matches the connected one."
              />
              <TroubleshootItem
                problem="Webhook not received"
                solution="Verify webhook URL. Check Supabase pg_cron is running: SELECT * FROM cron.job; The dispatch-webhooks job should be active."
              />
              <TroubleshootItem
                problem="Email not sending"
                solution="Verify Gmail App Password is correct (no spaces). Check Gmail is not blocking less secure apps."
              />
              <TroubleshootItem
                problem="'supabaseKey is required' error"
                solution="Missing SUPABASE_SERVICE_ROLE_KEY in environment. Add it in Vercel env vars AND local .env file."
              />
              <TroubleshootItem
                problem="Only admin sees own profile"
                solution="RLS policy issue. Run: CREATE POLICY 'Admins view all profiles' ON profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));"
              />
            </div>
          </Section>
        </article>
      </div>
    </div>
  );
}

// ============ HELPER COMPONENTS ============

function Section({
  id,
  title,
  icon: Icon,
  children,
}: {
  id: string;
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="bg-white rounded-2xl shadow-lg border border-black/5 p-5 sm:p-8 scroll-mt-24"
    >
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-gray-100">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0d4a3a] to-[#1b6e54] flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#0d1b2a]">{title}</h2>
      </div>
      <div className="text-gray-700">{children}</div>
    </section>
  );
}

function Step({
  num,
  title,
  children,
}: {
  num: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-6">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-8 h-8 rounded-full bg-[#0d4a3a] text-white font-bold flex items-center justify-center text-sm shrink-0">
          {num}
        </div>
        <h3 className="font-bold text-base sm:text-lg text-[#0d1b2a]">{title}</h3>
      </div>
      <div className="ml-0 sm:ml-11">{children}</div>
    </div>
  );
}

function CodeBlock({
  code,
  onCopy,
  copied,
}: {
  code: string;
  onCopy: (code: string) => void;
  copied: boolean;
}) {
  return (
    <div className="relative group my-3">
      <pre className="bg-[#0d1b2a] text-gray-100 rounded-lg p-4 pr-12 overflow-x-auto text-xs sm:text-sm font-mono leading-relaxed">
        <code>{code}</code>
      </pre>
      <button
        onClick={() => onCopy(code)}
        className="absolute top-3 right-3 p-1.5 rounded-md bg-white/10 hover:bg-white/20 text-white transition"
        title="Copy"
      >
        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
      </button>
    </div>
  );
}

function FieldInfo({
  label,
  description,
  example,
}: {
  label: string;
  description: string;
  example: string;
}) {
  return (
    <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
      <div className="font-semibold text-sm text-[#0d1b2a] mb-1">{label}</div>
      <div className="text-xs sm:text-sm text-gray-600 mb-2">{description}</div>
      <code className="text-xs bg-white px-2 py-1 rounded border border-gray-200 block truncate">
        {example}
      </code>
    </div>
  );
}

function PlanFile({
  file,
  description,
  code,
  onCopy,
  copied,
}: {
  file: string;
  description: string;
  code: string;
  onCopy: (code: string) => void;
  copied: boolean;
}) {
  return (
    <div className="bg-amber-50/50 border border-amber-200 rounded-lg p-3 sm:p-4 my-3">
      <div className="flex items-start gap-2 mb-2">
        <FileText className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
        <div className="min-w-0">
          <code className="text-xs font-mono text-amber-900 font-semibold break-all block">
            {file}
          </code>
          <div className="text-xs text-amber-800 mt-0.5">{description}</div>
        </div>
      </div>
      <CodeBlock code={code} onCopy={onCopy} copied={copied} />
    </div>
  );
}

function ActionItem({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition">
      <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <div className="font-semibold text-sm text-[#0d1b2a]">{title}</div>
        <div className="text-xs sm:text-sm text-gray-600 mt-0.5">{description}</div>
      </div>
    </div>
  );
}

function TroubleshootItem({ problem, solution }: { problem: string; solution: string }) {
  return (
    <details className="group bg-red-50/50 border border-red-200 rounded-lg overflow-hidden">
      <summary className="flex items-start gap-2 p-3 sm:p-4 cursor-pointer list-none">
        <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-sm text-red-900">{problem}</div>
        </div>
        <ChevronDown className="w-4 h-4 text-red-600 shrink-0 group-open:rotate-180 transition" />
      </summary>
      <div className="px-4 pb-4 text-xs sm:text-sm text-red-800 ml-6">
        <strong>Solution:</strong> {solution}
      </div>
    </details>
  );
}

function CustomizeTable() {
  const items = [
    { what: "Change subscription price", where: "3 files: subscription.tsx, subscription.functions.ts, admin/users.$id.tsx" },
    { what: "Change brand colors", where: "Search for #0d4a3a and #1b6e54 in all files" },
    { what: "Change logo", where: "Replace src/assets/panme-logo.jpg (same filename)" },
    { what: "Change QR center logo", where: "src/components/PayPageView.tsx — CENTER_LOGO constant" },
    { what: "Change order ID prefix", where: "src/lib/orders.functions.ts and src/routes/api/public/v1/orders.ts — gen10() function" },
    { what: "Change admin email", where: "SQL: UPDATE admin_settings SET admin_email = 'new@email.com' WHERE id = 1;" },
    { what: "Change UPI ID", where: "Admin → Gateway → Subscription UPI ID" },
    { what: "Change WhatsApp number", where: "src/routes/index.tsx — search '+91 99317 70622'" },
    { what: "Change email templates", where: "src/lib/gmail.functions.ts — html variable" },
    { what: "Change domain", where: "Supabase Auth URL config + Vercel domains + .env" },
    { what: "Backup database", where: "Supabase Dashboard → Settings → Database → Backups" },
  ];

  return (
    <div className="overflow-x-auto -mx-5 sm:mx-0 mt-4">
      <table className="w-full min-w-[500px] text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
            <th className="px-3 sm:px-4 py-3">What to Change</th>
            <th className="px-3 sm:px-4 py-3">Where</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {items.map((item, i) => (
            <tr key={i} className="hover:bg-gray-50">
              <td className="px-3 sm:px-4 py-3 font-medium text-[#0d1b2a]">{item.what}</td>
              <td className="px-3 sm:px-4 py-3 text-gray-600 text-xs">{item.where}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}