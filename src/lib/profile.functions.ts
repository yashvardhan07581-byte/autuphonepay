import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ============ UPDATE DISPLAY NAME + PROFILE INFO ============
const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(100).optional(),
  upi_id: z.string().max(100).optional(),
  payee_name: z.string().max(100).optional(),
  whatsapp: z.string().max(20).optional(),
});

export const updateMyProfileInfo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => UpdateProfileSchema.parse(input))
  .handler(async ({ data, context }) => {
    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    const updates: any = {};
    if (data.display_name !== undefined) updates.display_name = data.display_name;
    if (data.upi_id !== undefined) updates.upi_id = data.upi_id;
    if (data.payee_name !== undefined) updates.payee_name = data.payee_name;
    if (data.whatsapp !== undefined) updates.whatsapp = data.whatsapp;

    const { error } = await adminClient
      .from("profiles")
      .update(updates)
      .eq("id", context.userId);

    if (error) throw new Error(error.message);

    // Update auth metadata for whatsapp
    

    return { success: true };
  });

// ============ CHANGE EMAIL ============
const ChangeEmailSchema = z.object({
  new_email: z.string().email(),
});

export const changeMyEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => ChangeEmailSchema.parse(input))
  .handler(async ({ data, context }) => {
    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Update email in auth
    const { error: authError } = await adminClient.auth.admin.updateUserById(
      context.userId,
      { email: data.new_email, email_confirm: true }
    );

    if (authError) throw new Error(authError.message);

    // Update profile email
    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ email: data.new_email })
      .eq("id", context.userId);

    if (profileError) throw new Error(profileError.message);

    return { success: true };
  });

// ============ CHANGE PASSWORD ============
const ChangePasswordSchema = z.object({
  current_password: z.string().min(1),
  new_password: z.string().min(8).max(72),
});

export const changeMyPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input) => ChangePasswordSchema.parse(input))
  .handler(async ({ data, context }) => {
    const adminClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    // Get user email
    const { data: { user }, error: getUserError } =
      await adminClient.auth.admin.getUserById(context.userId);

    if (getUserError || !user?.email) {
      throw new Error("User not found");
    }

    // Verify current password by attempting signin
    const supabaseAuthClient = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    const { error: signInError } = await supabaseAuthClient.auth.signInWithPassword({
      email: user.email,
      password: data.current_password,
    });

    if (signInError) {
      throw new Error("Current password is incorrect");
    }

    // Update password
    const { error: updateError } = await adminClient.auth.admin.updateUserById(
      context.userId,
      { password: data.new_password }
    );

    if (updateError) throw new Error(updateError.message);

    return { success: true };
  });