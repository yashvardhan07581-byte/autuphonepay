import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import nodemailer from "nodemailer";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ SEND SUBSCRIPTION REMINDER ============
const ReminderSchema = z.object({
  user_id: z.string().uuid(),
  type: z.enum(["expiring", "expired"]),
});

export const sendSubscriptionReminderEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => ReminderSchema.parse(input))
  .handler(async ({ data, context }) => {
    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Verify caller is admin
    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", context.userId)
      .single();

    if (callerProfile?.role !== "admin") {
      throw new Error("Only admins can send reminders");
    }

    // Get Gmail SMTP settings
    const { data: settings } = await adminClient
      .from("admin_settings")
      .select("gmail_user, gmail_app_password")
      .eq("id", 1)
      .single();

    if (!settings?.gmail_user || !settings?.gmail_app_password) {
      throw new Error("Gmail SMTP not configured. Go to Admin → Gateway Settings.");
    }

    // Get target user
    const { data: targetUser, error: userError } = await adminClient
      .from("profiles")
      .select("email, display_name, subscription_plan, subscription_expires_at")
      .eq("id", data.user_id)
      .single();

    if (userError || !targetUser?.email) {
      throw new Error("User not found or email missing");
    }

    // Build email
    const planName = targetUser.subscription_plan?.toUpperCase() || "Free";
    const expiryDate = targetUser.subscription_expires_at
      ? new Date(targetUser.subscription_expires_at).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        })
      : "N/A";

    const isExpiring = data.type === "expiring";
    const subject = isExpiring
      ? `⚠️ Your ${planName} plan expires soon`
      : `🚫 Your ${planName} plan has expired`;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: -apple-system, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #0d4a3a, #1b6e54); color: white; padding: 30px; border-radius: 12px 12px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .body { background: #f9fafb; padding: 30px; border-radius: 0 0 12px 12px; }
          .info-box { background: white; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .info-box strong { color: #0d4a3a; }
          .btn { display: inline-block; background: #0d4a3a; color: white !important; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 10px 0; }
          .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 24px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${isExpiring ? "⚠️ Subscription Expiring Soon" : "🚫 Subscription Expired"}</h1>
          </div>
          <div class="body">
            <p>Hi <strong>${targetUser.display_name || "there"}</strong>,</p>
            
            <p>
              ${
                isExpiring
                  ? "Your AutoUPI subscription is about to expire. Please renew to avoid any interruption in your payment services."
                  : "Your AutoUPI subscription has expired. QR generation and API access are now locked until you renew."
              }
            </p>

            <div class="info-box">
              <p style="margin: 0 0 8px 0;"><strong>Current Plan:</strong> ${planName}</p>
              <p style="margin: 0;"><strong>Expiry Date:</strong> ${expiryDate}</p>
            </div>

            <p style="text-align: center; margin-top: 30px;">
              <a href="https://autuphonepay.vercel.app/subscription" class="btn">
                Renew Now
              </a>
            </p>

            <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
              If you have any questions, feel free to reply to this email.
            </p>
          </div>
          <div class="footer">
            <p>© ${new Date().getFullYear()} AutoUPI Payment Gateway</p>
            <p>This is an automated email. Please do not reply.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Send via Gmail SMTP
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: settings.gmail_user,
        pass: settings.gmail_app_password.replace(/\s/g, ""), // remove spaces
      },
    });

    try {
      await transporter.sendMail({
        from: `"AutoUPI" <${settings.gmail_user}>`,
        to: targetUser.email,
        subject,
        html,
      });
    } catch (mailError: any) {
      throw new Error(`Email failed: ${mailError.message}`);
    }

    // Log to admin_actions_log
    await adminClient.from("admin_actions_log").insert({
      admin_id: context.userId,
      action: `send_${data.type}_reminder`,
      target_user_id: data.user_id,
      details: {
        to_email: targetUser.email,
        subject,
        sent_at: new Date().toISOString(),
      },
    });

    return {
      success: true,
      to: targetUser.email,
      subject,
    };
  });