import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AddUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  display_name: z.string().min(1).max(100),
  make_admin: z.boolean().optional().default(false),
});

export const adminAddUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => AddUserSchema.parse(input))
  .handler(async ({ data, context }) => {
    // Service role client (server-side only)
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
      throw new Error("Only admins can create users");
    }

    // Create user via Admin API
    const { data: newUser, error } = await adminClient.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        display_name: data.display_name,
      },
    });

    if (error) throw new Error(error.message);
    if (!newUser.user) throw new Error("Failed to create user");

    // Update profile (role + verified)
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({
        role: data.make_admin ? "admin" : "user",
        is_verified: true,
      })
      .eq("id", newUser.user.id);

    if (profileError) throw new Error(profileError.message);

    return {
      userId: newUser.user.id,
      email: newUser.user.email,
    };
  });
  // ============ PASSWORD RESET ============
const ResetPasswordSchema = z.object({
  user_id: z.string().uuid(),
  redirect_to: z.string().url(),
});

export const adminSendPasswordReset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => ResetPasswordSchema.parse(input))
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
      throw new Error("Only admins can send password reset");
    }

    // Get user's email
    const { data: { user: targetUser }, error: getUserError } =
      await adminClient.auth.admin.getUserById(data.user_id);

    if (getUserError || !targetUser?.email) {
      throw new Error("User not found or email missing");
    }

    // Send password reset email
    const { error } = await adminClient.auth.resetPasswordForEmail(
      targetUser.email,
      { redirectTo: data.redirect_to }
    );

    if (error) throw new Error(error.message);

    return { sent: true, email: targetUser.email };
  });
  // ============ DIRECT PASSWORD CHANGE (Admin — no email) ============
const DirectPasswordSchema = z.object({
  user_id: z.string().uuid(),
  new_password: z.string().min(8).max(72),
});

export const adminDirectPasswordChange = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => DirectPasswordSchema.parse(input))
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
      throw new Error("Only admins can change user passwords");
    }

    // Directly update password
    const { error } = await adminClient.auth.admin.updateUserById(data.user_id, {
      password: data.new_password,
    });

    if (error) throw new Error(error.message);

    // Log action
    await adminClient.from("admin_actions_log").insert({
      admin_id: context.userId,
      action: "direct_password_change",
      target_user_id: data.user_id,
      details: { changed_at: new Date().toISOString() },
    });

    return { success: true };
  });