import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { swalSuccess } from "@/lib/swal";
import {
  Settings as SettingsIcon, KeyRound, Lock, CreditCard, Save, Eye, EyeOff, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") throw redirect({ to: "/generate" });
    return { user };
  },
  component: GatewaySettings,
});

function GatewaySettings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [apiKey, setApiKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [upiId, setUpiId] = useState("");
  const [payeeName, setPayeeName] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://autuphonepay.vercel.app");

  const [showApiKey, setShowApiKey] = useState(false);
  const [showWebhook, setShowWebhook] = useState(false);

  useEffect(() => {
    supabase
      .from("admin_settings")
      .select("*")
      .eq("id", 1)
      .single()
      .then(({ data, error }) => {
        if (error) {
          toast.error("Failed to load settings");
        } else if (data) {
          setApiKey(data.gateway_api_key ?? "");
          setWebhookSecret(data.gateway_webhook_secret ?? "");
          setUpiId(data.subscription_upi_id ?? "");
          setPayeeName(data.subscription_payee_name ?? "");
          setBaseUrl(data.gateway_base_url ?? "https://autuphonepay.vercel.app");
        }
        setLoading(false);
      });
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("admin_settings")
        .update({
          gateway_api_key: apiKey.trim() || null,
          gateway_webhook_secret: webhookSecret.trim() || null,
          subscription_upi_id: upiId.trim() || null,
          subscription_payee_name: payeeName.trim() || null,
          gateway_base_url: baseUrl.trim() || null,
          updated_by: user?.id,
          updated_at: new Date().toISOString(),
        })
        .eq("id", 1);

      if (error) throw error;
      swalSuccess("Settings saved successfully");
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0d4a3a]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d4a3a] to-[#1b6e54] shadow-xl p-6 flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
          <SettingsIcon className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Gateway Settings</h1>
          <p className="text-sm text-emerald-100/90 mt-0.5">
            Configure your AutoUPI gateway credentials
          </p>
        </div>
      </div>

      {/* Form */}
      <form onSubmit={save} className="bg-white rounded-2xl shadow-xl border border-black/5 p-8 space-y-6">
        {/* API Key */}
        <Field
          label="Gateway API Key"
          hint="Your AutoUPI API key (lk_live_...). Used to create subscription orders."
          icon={KeyRound}
        >
          <div className="relative">
            <input
              type={showApiKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="lk_live_..."
              className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowApiKey(!showApiKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>

        {/* Webhook Secret */}
        <Field
          label="Webhook Secret"
          hint="HMAC secret (whsec_...) for verifying webhook signatures."
          icon={Lock}
        >
          <div className="relative">
            <input
              type={showWebhook ? "text" : "password"}
              value={webhookSecret}
              onChange={(e) => setWebhookSecret(e.target.value)}
              placeholder="whsec_..."
              className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none font-mono text-sm"
            />
            <button
              type="button"
              onClick={() => setShowWebhook(!showWebhook)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showWebhook ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </Field>

        {/* UPI ID */}
        <Field
          label="Subscription UPI ID"
          hint="UPI VPA where subscription payments will be received."
          icon={CreditCard}
        >
          <input
            type="text"
            value={upiId}
            onChange={(e) => setUpiId(e.target.value)}
            placeholder="yourname@ybl"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none font-mono text-sm"
          />
        </Field>

        {/* Payee Name */}
        <Field label="Payee Name" hint="Business name shown to payers on the payment page.">
          <input
            type="text"
            value={payeeName}
            onChange={(e) => setPayeeName(e.target.value)}
            placeholder="AutoUPI"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none"
          />
        </Field>

        {/* Base URL */}
        <Field
          label="Gateway Base URL"
          hint="Your gateway's base URL. Used for API calls and webhook callbacks."
        >
          <input
            type="url"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://autuphonepay.vercel.app"
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none font-mono text-sm"
          />
        </Field>

        {/* Save */}
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-lg bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold tracking-wide transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "SAVE SETTINGS"}
        </button>
      </form>

      {/* Info Box */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2">Where to find these?</h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>API Key & Webhook Secret: Your AutoUPI dashboard → API Keys page</li>
          <li>Subscription UPI ID: Same UPI ID you use for receiving payments</li>
          <li>Payee Name: Business name shown on UPI apps</li>
        </ul>
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  icon: Icon,
  children,
}: {
  label: string;
  hint?: string;
  icon?: any;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-1.5">
        {Icon && <Icon className="w-4 h-4 text-[#0d4a3a]" />}
        <label className="text-sm font-semibold text-[#0d1b2a]">{label}</label>
      </div>
      {hint && <p className="text-xs text-gray-500 mb-2">{hint}</p>}
      {children}
    </div>
  );
}