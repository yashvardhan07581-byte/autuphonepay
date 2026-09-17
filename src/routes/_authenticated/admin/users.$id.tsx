import { createFileRoute, redirect, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminSendPasswordReset } from "@/lib/admin.functions";
import { toast } from "sonner";
import { swalSuccess } from "@/lib/swal";
import Swal from "sweetalert2";
import {
  ArrowLeft, Mail, User as UserIcon, CreditCard, ShieldCheck, ShieldAlert,
  Calendar, Loader2, CheckCircle2, XCircle, Trash2, KeyRound, Save,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users/$id")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") throw redirect({ to: "/generate" });
    return { user };
  },
  component: UserDetailPage,
});

type UserDetail = {
  id: string;
  email: string | null;
  display_name: string | null;
  upi_id: string | null;
  payee_name: string | null;
  role: string;
  is_verified: boolean;
  subscription_plan: string | null;
  subscription_status: string;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  created_at: string;
};

function UserDetailPage() {
  const { id } = useParams({ from: "/_authenticated/admin/users/$id" });
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Editable fields
  const [role, setRole] = useState<string>("user");
  const [isVerified, setIsVerified] = useState(false);
  const [plan, setPlan] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");

  const sendReset = useServerFn(adminSendPasswordReset);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      toast.error(error.message);
    } else if (data) {
      setUser(data as UserDetail);
      setRole(data.role);
      setIsVerified(data.is_verified);
      setPlan(data.subscription_plan ?? "");
      setExpiresAt(
        data.subscription_expires_at
          ? new Date(data.subscription_expires_at).toISOString().slice(0, 10)
          : ""
      );
    }
    setLoading(false);
  }

  async function saveChanges() {
    setSaving(true);
    try {
      const updatePayload: any = {
        role,
        is_verified: isVerified,
        subscription_plan: plan || null,
        subscription_status: plan ? "active" : "inactive",
        subscription_expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      };

      if (plan && !expiresAt) {
        const days = plan === "basic" ? 30 : plan === "pro" ? 60 : 200;
        const exp = new Date();
        exp.setDate(exp.getDate() + days);
        updatePayload.subscription_expires_at = exp.toISOString();
        updatePayload.subscription_started_at = new Date().toISOString();
        setExpiresAt(exp.toISOString().slice(0, 10));
      } else if (plan && expiresAt) {
        updatePayload.subscription_started_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("profiles")
        .update(updatePayload)
        .eq("id", id);

      if (error) throw error;

      const { data: { user: me } } = await supabase.auth.getUser();
      if (me) {
        await supabase.from("admin_actions_log").insert({
          admin_id: me.id,
          action: "update_user",
          target_user_id: id,
          details: updatePayload,
        });
      }

      swalSuccess("User updated successfully");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePasswordReset() {
    if (!user?.email) return;
    const confirm = await Swal.fire({
      title: "Send password reset?",
      text: `A password reset link will be emailed to ${user.email}`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0d4a3a",
      confirmButtonText: "Send",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    setResetting(true);
    try {
      await sendReset({
        data: {
          user_id: user.id,
          redirect_to: `${window.location.origin}/auth`,
        },
      });
      swalSuccess("Password reset email sent");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to send reset email");
    } finally {
      setResetting(false);
    }
  }

  async function deleteUser() {
    const confirm = await Swal.fire({
      title: "Delete this user?",
      text: "This will permanently delete the user account and all their data. This cannot be undone.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#dc2626",
      confirmButtonText: "Yes, delete",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    try {
      const { error } = await supabase.rpc("admin_delete_user", { target_user_id: id });
      if (error) throw error;
      swalSuccess("User deleted");
      window.location.href = "/admin/users";
    } catch (e: any) {
      toast.error(e.message ?? "Delete failed");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0d4a3a]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-center py-20 text-gray-500">
        User not found
        <div className="mt-4">
          <Link to="/admin/users" className="text-[#0d4a3a] font-semibold">
            ← Back to users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d4a3a] to-[#1b6e54] shadow-xl p-6">
        <Link
          to="/admin/users"
          className="inline-flex items-center gap-1 text-white/80 hover:text-white text-sm mb-3"
        >
          <ArrowLeft className="w-4 h-4" /> Back to users
        </Link>
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-xl bg-white/15 flex items-center justify-center">
            <UserIcon className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              {user.display_name || "Unnamed User"}
            </h1>
            <p className="text-sm text-emerald-100/90 mt-0.5">{user.email}</p>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <InfoCard title="Basic Info" icon={UserIcon}>
          <Row label="Email" value={user.email ?? "—"} />
          <Row label="Display Name" value={user.display_name ?? "—"} />
          <Row label="UPI ID" value={user.upi_id ?? "—"} mono />
          <Row label="Payee Name" value={user.payee_name ?? "—"} />
          <Row
            label="Joined"
            value={new Date(user.created_at).toLocaleDateString("en-IN", {
              day: "numeric", month: "long", year: "numeric",
            })}
          />
        </InfoCard>

        <InfoCard title="Subscription" icon={CreditCard}>
          <Row
            label="Current Plan"
            value={user.subscription_plan ? user.subscription_plan.toUpperCase() : "Free"}
          />
          <Row label="Status" value={user.subscription_status} />
          <Row
            label="Expires"
            value={
              user.subscription_expires_at
                ? new Date(user.subscription_expires_at).toLocaleDateString("en-IN")
                : "—"
            }
          />
        </InfoCard>
      </div>

      {/* Admin Actions */}
      <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-8 space-y-6">
        <h2 className="text-xl font-bold text-[#0d1b2a]">Admin Controls</h2>

        {/* Role */}
        <div>
          <label className="block text-sm font-semibold text-[#0d1b2a] mb-1.5">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none bg-white"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Verified */}
        <div className="flex items-center justify-between p-4 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            {isVerified ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            ) : (
              <XCircle className="w-5 h-5 text-gray-400" />
            )}
            <div>
              <div className="font-medium text-[#0d1b2a]">Verified User</div>
              <div className="text-xs text-gray-500">
                Verified users get a badge and higher trust
              </div>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isVerified}
              onChange={(e) => setIsVerified(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0d4a3a]"></div>
          </label>
        </div>

        {/* Subscription Plan */}
        <div>
          <label className="block text-sm font-semibold text-[#0d1b2a] mb-1.5">
            Subscription Plan
          </label>
          <select
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none bg-white"
          >
            <option value="">No Plan (Free)</option>
            <option value="basic">Basic — ₹99 / 30 days</option>
            <option value="pro">Pro — ₹299 / 60 days</option>
            <option value="yearly">Yearly — ₹999 / 200 days</option>
          </select>
        </div>

        {/* Expiry */}
        <div>
          <label className="block text-sm font-semibold text-[#0d1b2a] mb-1.5">
            Expiry Date (optional — auto-calculated if blank)
          </label>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none"
          />
        </div>

        {/* Save */}
        <button
          onClick={saveChanges}
          disabled={saving}
          className="w-full py-3.5 rounded-lg bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "SAVE CHANGES"}
        </button>

        {/* Password Reset */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-sm font-bold text-[#0d1b2a] mb-3">Account Security</h3>
          <button
            onClick={handlePasswordReset}
            disabled={resetting}
            className="px-4 py-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-sm transition flex items-center gap-2 disabled:opacity-60"
          >
            <KeyRound className="w-4 h-4" />
            {resetting ? "Sending..." : "Send Password Reset Email"}
          </button>
          <p className="text-xs text-gray-500 mt-2">
            User will receive an email with a link to set a new password.
          </p>
        </div>

        {/* Danger Zone */}
        <div className="pt-6 border-t border-gray-200">
          <h3 className="text-sm font-bold text-red-600 mb-3">Danger Zone</h3>
          <button
            onClick={deleteUser}
            className="px-4 py-2.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 font-semibold text-sm transition flex items-center gap-2"
          >
            <Trash2 className="w-4 h-4" /> Delete User
          </button>
        </div>
      </div>
    </div>
  );
}

function InfoCard({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: any;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-black/5 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#0d4a3a]/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-[#0d4a3a]" />
        </div>
        <h3 className="font-bold text-[#0d1b2a]">{title}</h3>
      </div>
      <div className="space-y-2.5">{children}</div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={`text-[#0d1b2a] font-medium text-right ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}