import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { createHmac, timingSafeEqual } from "crypto";

const PLANS: Record<string, { days: number }> = {
  basic: { days: 30 },
  pro: { days: 60 },
  yearly: { days: 365 },
};

const PLAN_RANK: Record<string, number> = {
  basic: 1,
  pro: 2,
  yearly: 3,
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

          const { data: sub } = await supabase
            .from("subscriptions")
            .select("id, user_id, plan, duration_days, payment_status")
            .eq("payment_order_id", orderId)
            .maybeSingle();

          if (!sub || sub.payment_status === "paid") {
            return new Response("ok", { status: 200 });
          }

          const planInfo = PLANS[sub.plan];
          if (!planInfo) {
            return new Response("Unknown plan", { status: 400 });
          }

          // ============ GET CURRENT PROFILE ============
          const { data: profile } = await supabase
            .from("profiles")
            .select("subscription_plan, subscription_status, subscription_expires_at")
            .eq("id", sub.user_id)
            .single();

          const now = new Date();

          // ============ PLAN RANK COMPARISON ============
          const currentPlan = profile?.subscription_plan ?? null;
          const currentRank = currentPlan ? PLAN_RANK[currentPlan] ?? 0 : 0;
          const newRank = PLAN_RANK[sub.plan] ?? 0;

          // ============ CARRY OVER REMAINING DAYS ============
          // Sirf upgrade/renew pe — downgrade pe fresh start
          let baseDate = now;

          if (
            profile?.subscription_status === "active" &&
            profile?.subscription_expires_at &&
            newRank >= currentRank
          ) {
            const existingExpiry = new Date(profile.subscription_expires_at);
            if (existingExpiry > now) {
              baseDate = existingExpiry;
            }
          }

          const expiresAt = new Date(baseDate);
          expiresAt.setDate(expiresAt.getDate() + planInfo.days);

          // ============ UPDATE SUBSCRIPTION ============
          await supabase
            .from("subscriptions")
            .update({
              payment_status: "paid",
              started_at: now.toISOString(),
              expires_at: expiresAt.toISOString(),
              updated_at: now.toISOString(),
            })
            .eq("id", sub.id);

          // ============ UPDATE PROFILE ============
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
        } else if (
          event.event === "payment.failed" ||
          event.event === "payment.expired"
        ) {
          await supabase
            .from("subscriptions")
            .update({
              payment_status:
                event.event === "payment.expired" ? "cancelled" : "failed",
              updated_at: new Date().toISOString(),
            })
            .eq("payment_order_id", event.order_id);
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});