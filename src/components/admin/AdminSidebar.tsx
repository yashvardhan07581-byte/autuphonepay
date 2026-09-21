import { Link, useRouterState } from "@tanstack/react-router";
import {
  SidebarMenu, SidebarMenuItem, SidebarMenuButton,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard, Users, DollarSign, Settings, ShieldCheck, BookOpen,
} from "lucide-react";

export const adminItems = [
  { title: "Dashboard", url: "/admin", icon: LayoutDashboard },
  { title: "Users", url: "/admin/users", icon: Users },
  { title: "Subscriptions", url: "/admin/subscriptions", icon: DollarSign },
  { title: "Gateway", url: "/admin/settings", icon: Settings },
  { title: "Docs", url: "/admin/docs", icon: BookOpen },
];

export function AdminSidebarSection() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="mt-2">
      <div className="mx-2 my-3 h-px bg-white/10" />
      <div className="px-3 py-2 flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
        <ShieldCheck className="w-3.5 h-3.5 text-amber-300/80 shrink-0 group-data-[collapsible=icon]:hidden" />
        <span className="text-[10px] font-bold text-amber-200/70 uppercase tracking-widest group-data-[collapsible=icon]:hidden">
          Admin Panel
        </span>
      </div>
      <SidebarMenu className="gap-1 px-0 mt-1">
        {adminItems.map((item) => {
          const active = pathname === item.url || pathname.startsWith(item.url + "/");
          return (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                className={`group/btn h-10 rounded-lg transition-all duration-200 relative hover:bg-amber-400/10 ${
                  active
                    ? "bg-gradient-to-r from-amber-400/20 to-transparent border-l-2 border-amber-400"
                    : "border-l-2 border-transparent"
                }`}
              >
                <Link to={item.url} className="flex items-center gap-3">
                  <item.icon
                    className={`w-5 h-5 shrink-0 transition-all duration-200 ${
                      active ? "text-amber-300" : "text-white/70"
                    }`}
                  />
                  <span
                    className={`font-medium text-sm truncate ${
                      active ? "text-amber-100" : "text-white/85"
                    }`}
                  >
                    {item.title}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          );
        })}
      </SidebarMenu>
    </div>
  );
}