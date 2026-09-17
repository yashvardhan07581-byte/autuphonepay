import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, DollarSign, TrendingUp, UserPlus, Loader2, ArrowUpRight,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "admin") {
      throw redirect({ to: "/generate" });
    }

    return { user };
  },
  component: AdminDashboard,
});

type Stats = {
  totalUsers: number;
  totalRevenue: number;
  activeSubscriptions: number;
  todaySignups: number;
};

function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // Total users
        const { count: totalUsers } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true });

        // Active subscriptions
        const { count: activeSubs } = await supabase
          .from("subscriptions")
          .select("*", { count: "exact", head: true })
          .eq("payment_status", "paid")
          .gte("expires_at", new Date().toISOString());

        // Total revenue (paid subscriptions sum)
        const { data: paidSubs } = await supabase
          .from("subscriptions")
          .select("amount")
          .eq("payment_status", "paid");

        const totalRevenue = (paidSubs ?? []).reduce(
          (sum, s) => sum + Number(s.amount || 0),
          0
        );

        // Today signups
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const { count: todaySignups } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .gte("created_at", todayStart.toISOString());

        setStats({
          totalUsers: totalUsers ?? 0,
          totalRevenue,
          activeSubscriptions: activeSubs ?? 0,
          todaySignups: todaySignups ?? 0,
        });
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d4a3a] to-[#1b6e54] shadow-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <TrendingUp className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-sm text-emerald-100/90 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 inline-block" />
              Overview of your platform
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-[#0d4a3a]" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            <StatCard
              title="Total Users"
              value={stats?.totalUsers ?? 0}
              icon={Users}
              color="blue"
            />
            <StatCard
              title="Total Revenue"
              value={`₹${(stats?.totalRevenue ?? 0).toLocaleString("en-IN")}`}
              icon={DollarSign}
              color="green"
            />
            <StatCard
              title="Active Subscriptions"
              value={stats?.activeSubscriptions ?? 0}
              icon={TrendingUp}
              color="purple"
            />
            <StatCard
              title="Today's Signups"
              value={stats?.todaySignups ?? 0}
              icon={UserPlus}
              color="orange"
            />
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-2xl shadow-xl border border-black/5 p-8">
            <h2 className="text-xl font-bold text-[#0d1b2a] mb-6">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <QuickAction
                title="Manage Users"
                description="View, add, or remove users"
                href="/admin/users"
              />
              <QuickAction
                title="Subscriptions"
                description="View subscriptions & revenue"
                href="/admin/subscriptions"
              />
              <QuickAction
                title="Gateway Settings"
                description="Configure API keys & UPI"
                href="/admin/settings"
              />
            </div>
          </div>
        </>
      )}
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
  color: "blue" | "green" | "purple" | "orange";
}) {
  const colors = {
    blue: "from-blue-500 to-blue-600",
    green: "from-emerald-500 to-emerald-600",
    purple: "from-purple-500 to-purple-600",
    orange: "from-orange-500 to-orange-600",
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg border border-black/5 p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`w-12 h-12 rounded-xl bg-gradient-to-br ${colors[color]} flex items-center justify-center shadow-md`}
        >
          <Icon className="w-6 h-6 text-white" />
        </div>
        <ArrowUpRight className="w-5 h-5 text-gray-300" />
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
}: {
  title: string;
  description: string;
  href: string;
}) {
  return (
    <a
      href={href}
      className="block p-5 rounded-xl border border-gray-200 hover:border-[#0d4a3a] hover:bg-[#0d4a3a]/5 transition-all group"
    >
      <div className="font-semibold text-[#0d1b2a] group-hover:text-[#0d4a3a]">
        {title}
      </div>
      <div className="text-sm text-gray-500 mt-1">{description}</div>
    </a>
  );
}