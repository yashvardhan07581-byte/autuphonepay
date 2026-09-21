import { createFileRoute, Outlet, redirect, useNavigate, Link, useRouterState } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarMenu,
  SidebarMenuItem, SidebarMenuButton, SidebarProvider, SidebarTrigger, SidebarHeader, SidebarFooter,
} from "@/components/ui/sidebar";
import { QrCode, KeyRound, Settings, FileText, LogOut, History, CreditCard, Home, UserCircle } from "lucide-react";
import { swalSuccess } from "@/lib/swal";
import logoUrl from "@/assets/panme-logo.jpg";
import { AdminSidebarSection } from "@/components/admin/AdminSidebar";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) throw redirect({ to: "/auth" });
      return { user: data.user };
    } catch (e) {
      if (e && typeof e === "object" && "to" in (e as any)) throw e;
      throw redirect({ to: "/auth" });
    }
  },
  component: AuthedLayout,
});

const items = [
  { title: "Dashboard", url: "/dashboard", icon: Home },
  { title: "Profile", url: "/profile", icon: UserCircle },
  { title: "Generate QR", url: "/generate", icon: QrCode },
  { title: "History", url: "/history", icon: History },
  { title: "Subscription", url: "/subscription", icon: CreditCard },
  { title: "API Keys", url: "/api-keys", icon: KeyRound },
  { title: "Settings", url: "/settings", icon: Settings },
];

function AdminSidebarGroup() {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          setIsAdmin(data?.role === "admin");
        });
    });
  }, []);

  if (!isAdmin) return null;

  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <AdminSidebarSection />
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

function AppSidebar() {
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  async function logout() {
    await supabase.auth.signOut();
    await swalSuccess("Logged out successfully");
    navigate({ to: "/auth", replace: true });
  }

  return (
    <Sidebar
      collapsible="icon"
      style={{
        ["--sidebar" as any]: "#0d4a3a",
        ["--sidebar-foreground" as any]: "#ffffff",
        ["--sidebar-accent" as any]: "rgba(255,255,255,0.15)",
        ["--sidebar-accent-foreground" as any]: "#ffffff",
        ["--sidebar-border" as any]: "rgba(255,255,255,0.1)",
        ["--sidebar-ring" as any]: "rgba(255,255,255,0.3)",
      }}
      className="border-r border-white/10 text-white bg-[#0d4a3a]"
    >
      <SidebarHeader className="px-3 py-4 border-b border-white/10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-white/15 flex items-center justify-center shadow-lg overflow-hidden shrink-0">
            <img src={logoUrl} alt="AutoUPI" className="w-6 h-6 object-contain" />
          </div>
          <div className="group-data-[collapsible=icon]:hidden min-w-0">
            <div className="font-bold text-sm leading-tight truncate">AutoUPI</div>
            <div className="text-[10px] text-white/60 truncate">Payment Gateway</div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              {items.map((item) => {
                const active = pathname === item.url;
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.title}
                      className={`group/btn h-10 rounded-lg transition-all duration-300 hover:bg-white/15 ${active ? "bg-white/20 shadow-inner" : ""}`}
                    >
                      <Link to={item.url} className="flex items-center gap-3">
                        <item.icon
                          className={`w-5 h-5 shrink-0 transition-transform duration-300 group-hover/btn:scale-110 ${
                            active ? "text-white" : "text-white/80"
                          }`}
                        />
                        <span className="font-medium text-sm truncate">{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}

              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Docs"
                  className="group/btn h-10 rounded-lg transition-all duration-300 hover:bg-white/15"
                >
                  <a href="/docs" target="_blank" rel="noopener" className="flex items-center gap-3">
                    <FileText className="w-5 h-5 shrink-0 text-white/80 transition-transform duration-300 group-hover/btn:scale-110" />
                    <span className="font-medium text-sm">Docs</span>
                  </a>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <AdminSidebarGroup />
      </SidebarContent>

      <SidebarFooter className="p-2 border-t border-white/10">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={logout}
              tooltip="Sign out"
              className="h-10 rounded-lg hover:bg-red-500/30 transition-all duration-300"
            >
              <LogOut className="w-5 h-5 shrink-0" />
              <span className="text-sm">Sign out</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}

function AuthedLayout() {
  return (
    <SidebarProvider>
      <div className="flex w-full min-h-screen bg-gradient-to-br from-[#e8f5ee] via-[#dfeee5] to-[#cfe3d5]">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center px-3 sm:px-4 border-b border-black/5 bg-white/60 backdrop-blur-sm shrink-0">
            <SidebarTrigger className="text-[#0d4a3a]" />
          </header>
          <main className="flex-1 p-3 sm:p-6 md:p-10">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}