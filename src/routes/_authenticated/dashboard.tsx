import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Home, CreditCard, QrCode, History, KeyRound, TrendingUp, DollarSign,
  ShoppingCart, CheckCircle2, AlertCircle, Loader2, ArrowUpRight,
  Sparkles, Clock,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "AutoUPI | Dashboard" }] }),
  component: UserDashboard,
});

type Profile = {
  display_name: string | null;
  email: string | null;
  subscription_plan: string | null;
  subscription_status: string;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
  is_verified: boolean;
};

type Stats = {
  totalOrders: number;
  paidOrders: number;
  totalRevenue: number;
  pendingOrders: number;
};

function UserDashboard() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: p } = await supabase
        .from("profiles")
        .select("display_name, email, subscription_plan, subscription_status, subscription_started_at, subscription_expires_at, is_verified")
        .eq("id", user.id)
        .single();
      setProfile(p);

      const { data: merchant } = await supabase
        .from("merchants")
        .select("id")
        .eq("owner_id", user.id)
        .maybeSingle();

      if (!merchant) {
        setLoading(false);
        return;
      }

      const { data: orders } = await supabase
        .from("orders")
        .select("status, payable_amount")
        .eq("merchant_id", merchant.id);

      const paid = (orders ?? []).filter((o) => o.status === "paid");
      const pending = (orders ?? []).filter((o) => o.status === "pending");

      setStats({
        totalOrders: orders?.length ?? 0,
        paidOrders: paid.length,
        totalRevenue: paid.reduce((s, o) => s + Number(o.payable_amount), 0),
        pendingOrders: pending.length,
      });

      const { data: recent } = await supabase
        .from("orders")
        .select("order_id, merchant_order_id, payable_amount, status, created_at, paid_at")
        .eq("merchant_id", merchant.id)
        .order("created_at", { ascending: false })
        .limit(5);

      setRecentOrders(recent ?? []);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const isActive =
    profile?.subscription_status === "active" &&
    profile?.subscription_expires_at &&
    new Date(profile.subscription_expires_at) > new Date();

  const daysLeft = profile?.subscription_expires_at
    ? Math.max(
        0,
        Math.ceil(
          (new Date(profile.subscription_expires_at).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : 0;

  // Total days for progress bar
  const totalDays =
    profile?.subscription_plan === "basic"
      ? 30
      : profile?.subscription_plan === "pro"
        ? 60
        : profile?.subscription_plan === "yearly"
          ? 200
          : 30;

  const progressPercent = isActive
    ? Math.max(0, Math.min(100, (daysLeft / totalDays) * 100))
    : 0;

  const isExpiringSoon = isActive && daysLeft <= 7;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0d4a3a]" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d4a3a] to-[#1b6e54] shadow-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <Home className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Welcome back, {profile?.display_name || "User"}!
            </h1>
            <p className="text-sm text-emerald-100/90 mt-0.5">
              Here's what's happening with your account
            </p>
          </div>
        </div>
      </div>

      {/* Subscription Card */}
      {isActive ? (
        <div className="rounded-2xl bg-white shadow-xl border border-emerald-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 p-5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {profile?.subscription_plan?.toUpperCase()} Plan Active
                </h2>
                <p className="text-xs text-emerald-50/90 mt-0.5">
                  Started{" "}
                  {profile?.subscription_started_at
                    ? new Date(profile.subscription_started_at).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })
                    : "—"}
                </p>
              </div>
            </div>
            <Link
              to="/subscription"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold text-sm transition backdrop-blur-sm"
            >
              <CreditCard className="w-4 h-4" /> Renew
            </Link>
          </div>

          <div className="p-6">
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <div className="text-3xl font-bold text-emerald-600">{daysLeft}</div>
                <div className="text-xs text-gray-500 mt-1">Days Left</div>
              </div>
              <div className="text-center border-x border-gray-100">
                <div className="text-3xl font-bold text-[#0d1b2a]">{totalDays}</div>
                <div className="text-xs text-gray-500 mt-1">Total Days</div>
              </div>
              <div className="text-center">
                <div className="text-sm font-bold text-[#0d1b2a]">
                  {profile?.subscription_expires_at
                    ? new Date(profile.subscription_expires_at).toLocaleDateString(
                        "en-IN",
                        { day: "numeric", month: "short" }
                      )
                    : "—"}
                </div>
                <div className="text-xs text-gray-500 mt-1">Expires</div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  isExpiringSoon
                    ? "bg-gradient-to-r from-amber-400 to-orange-500"
                    : "bg-gradient-to-r from-emerald-400 to-emerald-600"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Expiring warning */}
            {isExpiringSoon && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-200 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <p className="text-sm text-amber-800">
                  Your subscription expires in <strong>{daysLeft} days</strong>. Renew now to avoid
                  interruption.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-6 flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-amber-900">No Active Subscription</h3>
              <p className="text-sm text-amber-800">
                Buy a plan to unlock QR generation, API keys, and payment features.
              </p>
            </div>
          </div>
          <Link
            to="/subscription"
            className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-amber-500 hover:bg-amber-600 text-white font-bold transition shadow-lg"
          >
            <Sparkles className="w-4 h-4" /> View Plans
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Total Orders" value={stats?.totalOrders ?? 0} icon={ShoppingCart} color="blue" />
        <StatCard title="Paid Orders" value={stats?.paidOrders ?? 0} icon={CheckCircle2} color="green" />
        <StatCard title="Total Revenue" value={`₹${(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}`} icon={DollarSign} color="emerald" />
        <StatCard title="Pending" value={stats?.pendingOrders ?? 0} icon={Clock} color="orange" />
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-8">
        <h2 className="text-xl font-bold text-[#0d1b2a] mb-6">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction title="Generate QR" description="Create a payment QR code" href="/generate" icon={QrCode} />
          <QuickAction title="History" description="View past transactions" href="/history" icon={History} />
          <QuickAction title="API Keys" description="Manage your API keys" href="/api-keys" icon={KeyRound} />
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#0d1b2a]">Recent Orders</h2>
          <Link
            to="/history"
            className="text-sm text-[#0d4a3a] hover:text-[#1b6e54] font-medium flex items-center gap-1"
          >
            View all <ArrowUpRight className="w-4 h-4" />
          </Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <ShoppingCart className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p>No orders yet</p>
            <p className="text-xs mt-1">Your first order will appear here</p>
          </div>
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
                {recentOrders.map((o) => (
                  <tr key={o.order_id} className="text-sm">
                    <td className="py-3 font-mono text-xs text-gray-600">
                      {o.merchant_order_id || o.order_id.slice(0, 12)}
                    </td>
                    <td className="py-3 font-semibold text-[#0d1b2a]">
                      ₹{Number(o.payable_amount).toLocaleString("en-IN")}
                    </td>
                    <td className="py-3">
                      <OrderStatusBadge status={o.status} />
                    </td>
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
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: "blue" | "green" | "emerald" | "orange";
}) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    emerald: "from-teal-500 to-teal-600",
    orange: "from-orange-500 to-orange-600",
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

function QuickAction({
  title,
  description,
  href,
  icon: Icon,
}: {
  title: string;
  description: string;
  href: string;
  icon: any;
}) {
  return (
    <Link
      to={href}
      className="block p-5 rounded-xl border border-gray-200 hover:border-[#0d4a3a] hover:bg-[#0d4a3a]/5 transition-all group"
    >
      <div className="flex items-center gap-3 mb-2">
        <Icon className="w-5 h-5 text-[#0d4a3a]" />
        <div className="font-semibold text-[#0d1b2a] group-hover:text-[#0d4a3a]">{title}</div>
      </div>
      <div className="text-sm text-gray-500">{description}</div>
    </Link>
  );
}

function OrderStatusBadge({ status }: { status: string }) {
  const colors: any = {
    paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    expired: "bg-gray-100 text-gray-700 border-gray-200",
    failed: "bg-red-100 text-red-800 border-red-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
        colors[status] ?? colors.pending
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}