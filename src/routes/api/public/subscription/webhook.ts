import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

const PLANS: Record<string, { days: number }> = {
  basic: { days: 30 },
  pro: { days: 60 },
  yearly: { days: 200 },
};

export const Route = createFileRoute("/api/public/subscription/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        );

        // Load webhook secret
        const { data: settings } = await supabase
          .from("admin_settings")
          .select("gateway_webhook_secret")
          .eq("id", 1)
          .single();

        if (!settings?.gateway_webhook_secret) {
          return new Response("Webhook secret not configured", { status: 500 });
        }

        const rawBody = await request.text();
        const sig = request.headers.get("x-signature") ?? "";
        const [tPart = "", vPart = ""] = sig.split(",");
        const t = tPart.split("=")[1];
        const v1 = vPart.split("=")[1];

        if (!t || !v1) {
          return new Response("Bad signature", { status: 401 });
        }

        // Reject older than 5 min
        if (Math.abs(Date.now() / 1000 - Number(t)) > 300) {
          return new Response("Stale", { status: 400 });
        }

        const expected = createHmac("sha256", settings.gateway_webhook_secret)
          .update(`${t}.${rawBody}`)
          .digest("hex");

        const a = Buffer.from(expected, "hex");
        const b = Buffer.from(v1, "hex");
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        const event = JSON.parse(rawBody);

        if (event.event === "payment.success") {
          const orderId = event.order_id;

          // Find pending subscription
          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id, user_id, plan, duration_days, payment_status")
            .eq("payment_order_id", orderId)
            .maybeSingle();

          // Idempotency: already processed
          if (!sub || sub.payment_status === "paid") {
            return new Response("ok", { status: 200 });
          }

          const planInfo = PLANS[sub.plan];
          if (!planInfo) {
            return new Response("Unknown plan", { status: 400 });
          }

          const now = new Date();
          const expiresAt = new Date(now);
          expiresAt.setDate(expiresAt.getDate() + planInfo.days);

          // Update subscription record
          await supabase
            .from("subscriptions")
            .update({
              payment_status: "paid",
              started_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", sub.id);

          // Update user profile
          await supabase
            .from("profiles")
            .update({
              subscription_plan: sub.plan,
              subscription_status: "active",
              subscription_started_at: now.toISOString(),
              subscription_expires_at: expiresAt.toISOString(),
              is_verified: true,
            })
            .eq("id", sub.user_id);
        } else if (event.event === "payment.failed" || event.event === "payment.expired") {
          await supabase
            .from("subscriptions")
            .update({
              payment_status: event.event === "payment.expired" ? "cancelled" : "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("payment_order_id", event.order_id);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});