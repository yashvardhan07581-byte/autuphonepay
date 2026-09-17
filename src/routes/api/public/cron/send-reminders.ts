import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/public/cron/send-reminders")({
  server: {
    handlers: {
      POST: async () => {
        const supabase = createClient(
          process.env.SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          { auth: { persistSession: false } }
        );

        // Get users with 7 days left
        const { data: users7 } = await supabase.rpc("get_users_needing_reminder", {
          days_before: 7,
        });

        let sent = 0;

        for (const user of users7 ?? []) {
          // Send email via Supabase Auth (invite or custom)
          // Abhi ke liye bas log karo (email integration baad mein)
          await supabase.from("email_notifications").insert({
            user_id: user.user_id,
            email: user.email,
            type: "expiring_soon",
            metadata: {
              days_left: user.days_left,
              plan: user.plan,
              expires_at: user.expires_at,
            },
          });
          sent++;
        }

        return Response.json({ sent });
      },
    },
  },
});