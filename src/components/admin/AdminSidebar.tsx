import { createFileRoute, Outlet, redirect, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from "@/components/ui/sidebar";
import { LayoutDashboard, Users, DollarSign, Settings } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/AdminSidebar")({
  ssr: false,
  beforeLoad: async () => {
    try {
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
    } catch (e) {
      if (e && typeof e === "object" && "to" in (e as any)) throw e;
      throw redirect({ to: "/auth" });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  return <Outlet />;
}

// Admin sidebar items — exported so parent layout can use them
export const adminItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: DollarSign },
  { title: "Gateway", url: "/admin/settings", icon: Settings },
];

// Admin sidebar section component
export function AdminSidebarSection() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <>
      <div className="px-3 py-3 text-[11px] font-semibold text-white/50 uppercase tracking-wider">
        Admin Panel
      </div>
      <SidebarMenu className="gap-1">
        {adminItems.map((item) => {
          const active = pathname === item.url;
          return (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                className={`group/btn h-10 rounded-lg transition-all duration-300 hover:bg-white/15 hover:translate-x-1 hover:shadow-md ${
                  active ? "bg-white/20 shadow-inner" : ""
                }`}
              >
                <Link to={item.url}>
                  <item.icon
                    className={`w-4 h-4 transition-transform duration-300 group-hover/btn:scale-110 ${
                      active ? "text-white" : "text-white/80"
                    }`}
                  />
                  <span className="font-medium flex-1">{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </>
  );
}