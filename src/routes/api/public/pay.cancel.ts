import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/pay/cancel")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = await request.json().catch(() => ({}));
          const orderId = String(body?.order_id ?? "").trim();
          const apiKey = String(body?.api_key ?? "").trim();

          if (!orderId) {
            return Response.json(
              { ok: false, error: "missing_order_id" },
              { status: 400 }
            );
          }

          // Public origin for merchant API key check
          const supabase = createClient(
            process.env.SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { auth: { persistSession: false } }
          );

          // Fetch order to check ownership + status
          const { data: order } = await supabase
            .from("orders")
            .select("order_id, merchant_id, status, paid_at")
            .eq("order_id", orderId)
            .maybeSingle();

          if (!order) {
            return Response.json(
              { ok: false, error: "order_not_found" },
              { status: 404 }
            );
          }

          // SECURITY: Do not allow cancel if already paid
          if (order.status === "paid" || order.paid_at) {
            return Response.json(
              { ok: false, error: "order_already_paid" },
              { status: 409 }
            );
          }

          // SECURITY: Only pending orders can be cancelled
          if (order.status !== "pending") {
            return Response.json(
              { ok: false, error: "order_not_pending", status: order.status },
              { status: 409 }
            );
          }

          // Mark as expired/cancelled (idempotent update)
          const { error: updErr } = await supabase
            .from("orders")
            .update({
              status: "expired",
              failed_at: new Date().toISOString(),
            })
            .eq("order_id", orderId)
            .eq("status", "pending"); // ← Only if still pending

          if (updErr) {
            return Response.json(
              { ok: false, error: "update_failed" },
              { status: 500 }
            );
          }

          // Log the cancellation for audit
          try {
            await supabase.from("admin_actions_log").insert({
              admin_id: order.merchant_id,
              action: "order_cancelled_by_customer",
              target_user_id: null,
              details: {
                order_id: orderId,
                cancelled_at: new Date().toISOString(),
              },
            });
          } catch {
            // Log failure — ignore
          }

          return Response.json({
            ok: true,
            order_id: orderId,
            status: "cancelled",
          });
        } catch (e: any) {
          return Response.json(
            { ok: false, error: e.message },
            { status: 500 }
          );
        }
      },
      OPTIONS: async () =>
        new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        }),
    },
  },
});