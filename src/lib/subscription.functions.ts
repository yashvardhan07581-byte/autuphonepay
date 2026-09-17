import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PLANS = {
  basic: { price: 99, days: 30 },
  pro: { price: 299, days: 60 },
  yearly: { price: 999, days: 200 },
} as const;

const CreateOrderSchema = z.object({
  plan: z.enum(["basic", "pro", "yearly"]),
});

export const createSubscriptionOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => CreateOrderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Load admin settings (API key, UPI, etc.)
    const { data: settings } = await adminClient
      .from("admin_settings")
      .select("gateway_api_key, gateway_base_url, subscription_upi_id, subscription_payee_name")
      .eq("id", 1)
      .single();

    if (!settings?.gateway_api_key) {
      throw new Error("Gateway API key not configured. Contact admin.");
    }

    // Get user
    const { data: { user } } = await adminClient.auth.admin.getUserById(context.userId);
    if (!user) throw new Error("User not found");

    const planInfo = PLANS[data.plan];

    // Create order on AutoUPI gateway
    const gatewayUrl = settings.gateway_base_url || "https://autuphonepay.vercel.app";
    const publicOrigin = gatewayUrl; // Same gateway serves both public and API

    const orderPayload = {
      amount: planInfo.price,
      merchant_order_id: `sub_${context.userId.slice(0, 8)}_${Date.now()}`,
      success_url: `${publicOrigin}/subscription?status=success`,
      failure_url: `${publicOrigin}/subscription?status=failed`,
      webhook_url: `${publicOrigin}/api/public/subscription/webhook`,
      customer: {
        email: user.email,
        name: user.user_metadata?.display_name || user.email?.split("@")[0],
      },
    };

    const response = await fetch(`${gatewayUrl}/api/public/v1/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${settings.gateway_api_key}`,
      },
      body: JSON.stringify(orderPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gateway error: ${errText}`);
    }

    const order = await response.json();

    // Save pending subscription in DB
    const { error: insertError } = await adminClient
      .from("subscriptions")
      .insert({
        user_id: context.userId,
        plan: data.plan,
        amount: planInfo.price,
        duration_days: planInfo.days,
        payment_order_id: order.order_id,
        payment_status: "pending",
      });

    if (insertError) throw new Error(insertError.message);

    return {
      order_id: order.order_id,
      payable_amount: order.payable_amount,
      payment_url: order.payment_url,
      upi_uri: order.upi_uri,
      qr_base64: order.qr_base64,
      expires_at: order.expires_at,
    };
  });

// ============ POLL ORDER STATUS ============
const PollSchema = z.object({
  order_id: z.string().min(1),
});

export const checkSubscriptionOrderStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => PollSchema.parse(input))
  .handler(async ({ data, context }) => {
    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Check our DB first
    const { data: sub } = await adminClient
      .from("subscriptions")
      .select("payment_status, started_at, expires_at")
      .eq("payment_order_id", data.order_id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (sub?.payment_status === "paid") {
      return {
        status: "paid",
        started_at: sub.started_at,
        expires_at: sub.expires_at,
      };
    }

    // Query gateway directly as fallback
    const { data: settings } = await adminClient
      .from("admin_settings")
      .select("gateway_api_key, gateway_base_url")
      .eq("id", 1)
      .single();

    if (!settings?.gateway_api_key) {
      return { status: sub?.payment_status ?? "pending" };
    }

    const gatewayUrl = settings.gateway_base_url || "https://autuphonepay.vercel.app";
    const res = await fetch(
      `${gatewayUrl}/api/public/v1/orders/${data.order_id}`,
      {
        headers: {
          "Authorization": `Bearer ${settings.gateway_api_key}`,
        },
      }
    );

    if (!res.ok) return { status: sub?.payment_status ?? "pending" };
    const order = await res.json();
    return { status: order.status };
  });