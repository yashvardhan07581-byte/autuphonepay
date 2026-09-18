import { createFileRoute, redirect, Link } from "@tanstack/react-router";
import { useEffect, useState, useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { adminAddUser } from "@/lib/admin.functions";
import { toast } from "sonner";
import { swalSuccess } from "@/lib/swal";
import {
  Users as UsersIcon, Search, ShieldCheck, ShieldAlert,
  CheckCircle2, XCircle, Loader2, Eye, Plus, X, Mail, Lock, User as UserIcon,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/users/")({
  ssr: false,
  beforeLoad: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw redirect({ to: "/auth" });
    const { data: profile } = await supabase
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") throw redirect({ to: "/generate" });
    return { user };
  },
  component: UsersPage,
});

type UserRow = {
  id: string;
  email: string | null;
  display_name: string | null;
  whatsapp: string | null;
  role: string;
  is_verified: boolean;
  subscription_plan: string | null;
  subscription_status: string;
  subscription_expires_at: string | null;
  created_at: string;
};

function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [subFilter, setSubFilter] = useState<"all" | "active" | "inactive">("all");
  const [showAddModal, setShowAddModal] = useState(false);

  async function load() {
    setLoading(true);
        const { data, error } = await supabase
      .from("profiles")
      .select("id,email,display_name,whatsapp,role,is_verified,subscription_plan,subscription_status,subscription_expires_at,created_at")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setUsers(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== "all" && u.role !== roleFilter) return false;
      if (subFilter === "active" && u.subscription_status !== "active") return false;
      if (subFilter === "inactive" && u.subscription_status === "active") return false;
      if (search) {
        const s = search.toLowerCase();
        const hay = `${u.email ?? ""} ${u.display_name ?? ""}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [users, search, roleFilter, subFilter]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d4a3a] to-[#1b6e54] shadow-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <UsersIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Users</h1>
            <p className="text-sm text-emerald-100/90 mt-0.5">
              {users.length} total · {filtered.length} shown
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-white text-[#0d4a3a] font-bold text-sm hover:bg-white/90 transition shadow-lg"
        >
          <Plus className="w-4 h-4" /> Add User
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-lg border border-black/5 p-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by email or name..."
            className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none text-sm"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as any)}
          className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none text-sm bg-white"
        >
          <option value="all">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={subFilter}
          onChange={(e) => setSubFilter(e.target.value as any)}
          className="px-4 py-2.5 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none text-sm bg-white"
        >
          <option value="all">All Subscriptions</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-[#0d4a3a]" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">No users found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                               <tr className="text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                  <th className="px-6 py-3">User</th>
                  <th className="px-6 py-3">WhatsApp</th>
                  <th className="px-6 py-3">Role</th>
                  <th className="px-6 py-3">Verified</th>
                  <th className="px-6 py-3">Subscription</th>
                  <th className="px-6 py-3">Joined</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((u) => (
                  <tr key={u.id} className="hover:bg-gray-50/50 transition">
                                        <td className="px-6 py-4">
                      <div className="font-medium text-[#0d1b2a] text-sm">
                        {u.display_name || "—"}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{u.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      {u.whatsapp ? (
                        <span className="text-xs text-gray-700 font-mono">
                          {u.whatsapp}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <RoleBadge role={u.role} />
                    </td>
                    <td className="px-6 py-4">
                      {u.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 text-xs font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Yes
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-gray-400 text-xs font-medium">
                          <XCircle className="w-3.5 h-3.5" /> No
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <SubBadge plan={u.subscription_plan} status={u.subscription_status} />
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-500">
                      {new Date(u.created_at).toLocaleDateString("en-IN", {
                        day: "numeric", month: "short", year: "numeric",
                      })}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        to="/admin/users/$id"
                        params={{ id: u.id }}
                        className="inline-flex items-center gap-1 text-[#0d4a3a] hover:text-[#1b6e54] text-xs font-medium"
                      >
                        <Eye className="w-3.5 h-3.5" /> View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <AddUserModal
          onClose={() => setShowAddModal(false)}
          onSuccess={() => {
            setShowAddModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function AddUserModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const add = useServerFn(adminAddUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [makeAdmin, setMakeAdmin] = useState(false);
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await add({
        data: { email, password, display_name: displayName, make_admin: makeAdmin },
      });
      swalSuccess("User created successfully");
      onSuccess();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
        <h2 className="text-xl font-bold text-[#0d1b2a] mb-1">Add New User</h2>
        <p className="text-sm text-gray-500 mb-6">
          Create a new user account manually.
        </p>

        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#0d1b2a] mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user@example.com"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0d1b2a] mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 8 characters"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-[#0d1b2a] mb-1.5">
              Display Name
            </label>
            <div className="relative">
              <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-3 rounded-lg border border-gray-300 focus:border-[#0d4a3a] outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 p-4 rounded-lg border border-gray-200">
            <input
              type="checkbox"
              id="makeAdmin"
              checked={makeAdmin}
              onChange={(e) => setMakeAdmin(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-[#0d4a3a] focus:ring-[#0d4a3a]"
            />
            <label htmlFor="makeAdmin" className="text-sm text-[#0d1b2a] cursor-pointer">
              Grant <strong>Admin</strong> privileges
            </label>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:bg-gray-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-3 rounded-lg bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold transition disabled:opacity-60"
            >
              {saving ? "Creating..." : "Create User"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === "admin") {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-200">
        <ShieldCheck className="w-3 h-3" /> Admin
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
      <ShieldAlert className="w-3 h-3" /> User
    </span>
  );
}

function SubBadge({ plan, status }: { plan: string | null; status: string }) {
  if (status === "active" && plan) {
    const colors: any = {
      basic: "bg-blue-100 text-blue-800 border-blue-200",
      pro: "bg-purple-100 text-purple-800 border-purple-200",
      yearly: "bg-emerald-100 text-emerald-800 border-emerald-200",
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${colors[plan] ?? colors.basic}`}>
        {plan.toUpperCase()} · Active
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 border border-gray-200">
      Inactive
    </span>
  );
}