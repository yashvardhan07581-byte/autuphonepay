import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  DollarSign, TrendingUp, Calendar, Search, Loader2, IndianRupee,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/subscriptions")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") throw redirect({ to: "/generate" });
    return { user };
  },
  component: SubscriptionsPage,
});

type SubRow = {
  id: string;
  user_id: string;
  plan: string;
  amount: number;
  duration_days: number;
  payment_status: string;
  started_at: string | null;
  expires_at: string | null;
  created_at: string;
  user_email?: string;
  user_name?: string;
};

function SubscriptionsPage() {
  const [subs, setSubs] = useState<SubRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [planFilter, setPlanFilter] = useState<"all" | "basic" | "pro" | "yearly">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "failed">("all");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const { data: subsData, error } = await supabase
        .from("subscriptions")
        .select(`
          id, user_id, plan, amount, duration_days,
          payment_status, started_at, expires_at, created_at
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!subsData || subsData.length === 0) {
        setSubs([]);
        setLoading(false);
        return;
      }

      const userIds = [...new Set(subsData.map((s) => s.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, display_name")
        .in("id", userIds);

      const profileMap = new Map(
        (profiles ?? []).map((p) => [p.id, { email: p.email, name: p.display_name }])
      );

      const enriched = subsData.map((s) => ({
        ...s,
        user_email: profileMap.get(s.user_id)?.email ?? "—",
        user_name: profileMap.get(s.user_id)?.name ?? "—",
      }));

      setSubs(enriched);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  const filtered = useMemo(() => {
    return subs.filter((s) => {
      if (planFilter !== "all" && s.plan !== planFilter) return false;
      if (statusFilter !== "all" && s.payment_status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const hay = `${s.user_email ?? ""} ${s.user_name ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [subs, planFilter, statusFilter, search]);

  const stats = useMemo(() => {
    const paidSubs = subs.filter((s) => s.payment_status === "paid");
    const totalRevenue = paidSubs.reduce((sum, s) => sum + Number(s.amount), 0);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const monthRevenue = paidSubs
      .filter((s) => new Date(s.created_at) >= monthStart)
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const todayRevenue = paidSubs
      .filter((s) => new Date(s.created_at) >= todayStart)
      .reduce((sum, s) => sum + Number(s.amount), 0);

    const activeSubs = paidSubs.filter(
      (s) => s.expires_at && new Date(s.expires_at) > now
    ).length;

    return {
      totalRevenue,
      monthRevenue,
      todayRevenue,
      activeSubs,
      totalCount: paidSubs.length,
    };
  }, [subs]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d4a3a] to-[#1b6e54] shadow-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <DollarSign className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Subscriptions</h1>
            <p className="text-sm text-emerald-100/90 mt-0.5">
              {subs.length} total · {filtered.length} shown
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatBox
          title="Total Revenue"
          value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`}
          icon={IndianRupee}
          color="emerald"
        />
        <StatBox
          title="This Month"
          value={`₹${stats.monthRevenue.toLocaleString("en-IN")}`}
          icon={Calendar}
          color="blue"
        />
        <StatBox
          title="Today"
          value={`₹${stats.todayRevenue.toLocaleString("en-IN")}`}
          icon={TrendingUp}
          color="purple"
        />
        <StatBox
          title="Active Subs"
          value={stats.activeSubs}
          icon={DollarSign}
          color="orange"
        />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-black/5 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by user email or name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none text-sm"
          />
        </div>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value as any)}
          className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none text-sm bg-white"
        >
          <option value="all">All Plans</option>
          <option value="basic">Basic</option>
          <option value="pro">Pro</option>
          <option value="yearly">Yearly</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as any)}
          className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none text-sm bg-white"
        >
          <option value="all">All Status</option>
          <option value="paid">Paid</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#0d4a3a]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-2">No subscriptions yet</p>
            <p className="text-xs text-gray-400">
              Once users start buying plans, they will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">Plan</th>
                  <th className="px-6 py-3">Amount</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3">Started</th>
                  <th className="px-6 py-3">Expires</th>
                  <th className="px-6 py-3">Purchased</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4">
                      <div className="font-medium text-[#0d1b2a] text-sm">
                        {s.user_name}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{s.user_email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <PlanBadge plan={s.plan} />
                    </td>
                    <td className="px-6 py-4 font-semibold text-[#0d1b2a] text-sm">
                      ₹{Number(s.amount).toLocaleString("en-IN")}
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={s.payment_status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {s.started_at
                        ? new Date(s.started_at).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {s.expires_at
                        ? new Date(s.expires_at).toLocaleDateString("en-IN")
                        : "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(s.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
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

function StatBox({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string | number;
  icon: any;
  color: "emerald" | "blue" | "purple" | "orange";
}) {
  const colors = {
    emerald: "from-emerald-500 to-emerald-600",
    blue: "from-blue-500 to-blue-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-black/5 p-6">
      <div className="flex items-center justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-md`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="text-2xl font-bold text-[#0d1b2a]">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{title}</div>
    </div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const colors: any = {
    basic: "bg-blue-100 text-blue-800 border-blue-200",
    pro: "bg-purple-100 text-purple-800 border-purple-200",
    yearly: "bg-emerald-100 text-emerald-800 border-emerald-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
        colors[plan] ?? "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      {plan.toUpperCase()}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: any = {
    paid: "bg-emerald-100 text-emerald-800 border-emerald-200",
    pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
    failed: "bg-red-100 text-red-800 border-red-200",
    cancelled: "bg-gray-100 text-gray-700 border-gray-200",
    refunded: "bg-orange-100 text-orange-800 border-orange-200",
  };
  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${
        colors[status] ?? "bg-gray-100 text-gray-700 border-gray-200"
      }`}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}