import { createFileRoute, redirect, useParams, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  adminSendPasswordReset,
  adminDirectPasswordChange,
} from "@/lib/admin.functions";
import { sendSubscriptionReminderEmail } from "@/lib/gmail.functions";
import { toast } from "sonner";
import { swalSuccess } from "@/lib/swal";
import Swal from "sweetalert2";
import {
  ArrowLeft, User as UserIcon, CreditCard, Loader2, CheckCircle2, XCircle,
  Trash2, KeyRound, Save, ShoppingCart, DollarSign, TrendingUp, History,
  Mail, Eye, EyeOff, Bell,
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
  whatsapp: string | null;
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

type OrderRow = {
  order_id: string;
  merchant_order_id: string | null;
  payable_amount: number;
  status: string;
  created_at: string;
  paid_at: string | null;
};

type SubRow = {
  id: string;
  plan: string;
  amount: number;
  payment_status: string;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
};

function UserDetailPage() {
  const { id } = useParams({ from: "/_authenticated/admin/users/$id" });
  const [user, setUser] = useState<UserDetail | null>(null);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [role, setRole] = useState<string>("user");
  const [isVerified, setIsVerified] = useState(false);
  const [plan, setPlan] = useState<string>("");
  const [expiresAt, setExpiresAt] = useState<string>("");

  const [newPassword, setNewPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);

  const [sendingReminder, setSendingReminder] = useState<string | null>(null);

  const sendReset = useServerFn(adminSendPasswordReset);
  const directPassChange = useServerFn(adminDirectPasswordChange);
  const sendReminderEmail = useServerFn(sendSubscriptionReminderEmail);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      if (!data) return;

      setUser(data as UserDetail);
      setRole(data.role);
      setIsVerified(data.is_verified);
      setPlan(data.subscription_plan ?? "");
      setExpiresAt(
        data.subscription_expires_at
          ? new Date(data.subscription_expires_at).toISOString().slice(0, 10)
          : ""
      );

      const { data: merchant } = await supabase
        .from("merchants")
        .select("id")
        .eq("owner_id", id)
        .maybeSingle();

      if (merchant) {
        const { data: o } = await supabase
          .from("orders")
          .select("order_id, merchant_order_id, payable_amount, status, created_at, paid_at")
          .eq("merchant_id", merchant.id)
          .order("created_at", { ascending: false })
          .limit(10);
        setOrders(o ?? []);
      }

      const { data: s } = await supabase
        .from("subscriptions")
        .select("id, plan, amount, payment_status, started_at, expires_at, created_at")
        .eq("user_id", id)
        .order("created_at", { ascending: false });
      setSubs(s ?? []);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
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

      const { error } = await supabase.from("profiles").update(updatePayload).eq("id", id);
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

  async function handleDirectPasswordChange() {
    if (newPassword.length < 8) {
      return toast.error("Password must be at least 8 characters");
    }

    const confirm = await Swal.fire({
      title: "Change password directly?",
      text: `This will immediately change ${user?.email}'s password. No email will be sent.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#0d4a3a",
      confirmButtonText: "Yes, change it",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    setChangingPass(true);
    try {
      await directPassChange({
        data: {
          user_id: user!.id,
          new_password: newPassword,
        },
      });
      swalSuccess("Password changed successfully");
      setNewPassword("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setChangingPass(false);
    }
  }

  async function sendSubscriptionReminder(type: "expiring" | "expired") {
    if (!user?.email) {
      return toast.error("User has no email");
    }

    const confirm = await Swal.fire({
      title: type === "expiring" ? "Send Expiring Reminder?" : "Send Expired Reminder?",
      html: `Email will be sent to <strong>${user.email}</strong>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#0d4a3a",
      confirmButtonText: "Send Email",
      cancelButtonText: "Cancel",
    });
    if (!confirm.isConfirmed) return;

    setSendingReminder(type);
    try {
      const result = await sendReminderEmail({
        data: {
          user_id: user.id,
          type,
        },
      });
      swalSuccess(`Email sent to ${result.to}`);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSendingReminder(null);
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

  const paidOrders = orders.filter((o) => o.status === "paid");
  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.payable_amount), 0);
  const totalSubsSpent = subs
    .filter((s) => s.payment_status === "paid")
    .reduce((sum, s) => sum + Number(s.amount), 0);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
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

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <StatBox title="Total Orders" value={orders.length} icon={ShoppingCart} color="blue" />
        <StatCard title="Order Revenue" value={`₹${totalRevenue.toLocaleString("en-IN")}`} icon={DollarSign} color="emerald" />
        <StatCard title="Subscriptions Spent" value={`₹${totalSubsSpent.toLocaleString("en-IN")}`} icon={TrendingUp} color="purple" />
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <InfoCard title="Basic Info" icon={UserIcon}>
          <Row label="Email" value={user.email ?? "—"} />
          <Row label="Display Name" value={user.display_name ?? "—"} />
          <Row label="WhatsApp" value={user.whatsapp ?? "—"} mono />
          <Row label="UPI ID" value={user.upi_id ?? "—"} mono />
          <Row label="Payee Name" value={user.payee_name ?? "—"} />
          <Row
            label="Joined"
            value={new Date(user.created_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          />
        </InfoCard>

        <InfoCard title="Subscription" icon={CreditCard}>
          <Row label="Current Plan" value={user.subscription_plan ? user.subscription_plan.toUpperCase() : "Free"} />
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

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-8">
        <h2 className="text-xl font-bold text-[#0d1b2a] mb-6 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-[#0d4a3a]" /> Recent Orders
        </h2>
        {orders.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No orders yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="pb-3">Order ID</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((o) => (
                  <tr key={o.order_id} className="text-sm">
                    <td className="py-3 font-mono text-xs text-gray-600">
                      {o.merchant_order_id || o.order_id}
                    </td>
                    <td className="py-3 font-semibold text-[#0d1b2a]">
                      ₹{Number(o.payable_amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3"><StatusBadge status={o.status} /></td>
                    <td className="py-3 text-xs text-gray-500">
                      {new Date(o.created_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Subscription History */}
      <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-8">
        <h2 className="text-xl font-bold text-[#0d1b2a] mb-6 flex items-center gap-2">
          <History className="w-5 h-5 text-[#0d4a3a]" /> Subscription History
        </h2>
        {subs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">No subscriptions yet</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-gray-100">
                <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="pb-3">Plan</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Started</th>
                  <th className="pb-3">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subs.map((s) => (
                  <tr key={s.id} className="text-sm">
                    <td className="py-3"><PlanBadge plan={s.plan} /></td>
                    <td className="py-3 font-semibold text-[#0d1b2a]">
                      ₹{Number(s.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3"><StatusBadge status={s.payment_status} /></td>
                    <td className="py-3 text-xs text-gray-500">
                      {s.started_at ? new Date(s.started_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="py-3 text-xs text-gray-500">
                      {s.expires_at ? new Date(s.expires_at).toLocaleDateString("en-IN") : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Admin Controls */}
      <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-8 space-y-6">
        <h2 className="text-xl font-bold text-[#0d1b2a]">Admin Controls</h2>

        <div>
          <label className="block text-sm font-semibold text-[#0d1b2a] mb-1.5">Role</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none bg-white"
          >
            <option value="user">User</option>
            <option value="admin">Admin</option>
          </select>
        </div>

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
            <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0d4a3a]"></div>
          </label>
        </div>

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

        <button
          onClick={saveChanges}
          disabled={saving}
          className="w-full py-3.5 rounded-lg bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "SAVE CHANGES"}
        </button>

        {/* Account Security */}
        <div className="pt-6 border-t border-gray-200 space-y-4">
          <h3 className="text-sm font-bold text-[#0d1b2a]">Account Security</h3>

          {/* Direct Password Change */}
          <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200 space-y-3">
            <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
              <KeyRound className="w-4 h-4" />
              Direct Password Change (No Email)
            </div>
            <p className="text-xs text-emerald-700">
              Set a new password immediately. User will be able to login with it right away.
            </p>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showNewPass ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="New password (min 8 chars)"
                  className="w-full px-4 py-2.5 pr-11 rounded-lg border border-emerald-300 focus:border-emerald-500 outline-none text-sm bg-white"
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(!showNewPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showNewPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <button
                onClick={handleDirectPasswordChange}
                disabled={changingPass || newPassword.length < 8}
                className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm transition disabled:opacity-60 whitespace-nowrap"
              >
                {changingPass ? "Changing..." : "Change Password"}
              </button>
            </div>
          </div>

          {/* Subscription Reminder */}
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 space-y-3">
            <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
              <Bell className="w-4 h-4" />
              Send Subscription Reminder
            </div>
            <p className="text-xs text-amber-700">
              Send an email reminder to this user about their subscription status.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => sendSubscriptionReminder("expiring")}
                disabled={sendingReminder !== null || !user?.email}
                className="flex-1 px-3 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition disabled:opacity-60"
              >
                {sendingReminder === "expiring" ? "Sending..." : "Expiring Reminder"}
              </button>
              <button
                onClick={() => sendSubscriptionReminder("expired")}
                disabled={sendingReminder !== null || !user?.email}
                className="flex-1 px-3 py-2.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition disabled:opacity-60"
              >
                {sendingReminder === "expired" ? "Sending..." : "Expired Reminder"}
              </button>
            </div>
          </div>
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

// Helper components
function StatBox({ title, value, icon: Icon, color }: { title: string; value: string | number; icon: any; color: "blue" | "emerald" | "purple" }) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    emerald: "from-emerald-500 to-emerald-600",
    purple: "from-purple-500 to-purple-600",
  };
  return (
    <div className="bg-white rounded-2xl shadow-lg border border-black/5 p-6">
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-md mb-4`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
      <div className="text-2xl font-bold text-[#0d1b2a]">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{title}</div>
    </div>
  );
}

const StatCard = StatBox;

function InfoCard({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
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

function StatusBadge({ status }: { status: string }) {
  const colors: any = {
    paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    expired: "bg-gray-100 text-gray-700 border-gray-200",
    failed: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-gray-100 text-gray-700 border-gray-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[status] ?? colors.pending}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: any = {
    basic: "bg-blue-100 text-blue-800 border-blue-200",
    pro: "bg-purple-100 text-purple-800 border-purple-200",
    yearly: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[plan] ?? "bg-gray-100 text-gray-700 border-gray-200"}`}>
      {plan.toUpperCase()}
    </span>
  );
}