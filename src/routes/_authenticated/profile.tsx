import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import {
  updateMyProfileInfo,
  changeMyEmail,
  changeMyPassword,
} from "@/lib/profile.functions";
import { toast } from "sonner";
import { swalSuccess } from "@/lib/swal";
import {
  User as UserIcon, Mail, Lock, Save, Loader2, Eye, EyeOff, Loader,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "AutoUPI | Profile" }] }),
  component: ProfilePage,
});

type Profile = {
  display_name: string | null;
  email: string | null;
  role: string;
};

function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [name, setName] = useState("");
 
  const [whatsapp, setWhatsapp] = useState("");

  const [savingProfile, setSavingProfile] = useState(false);

  // Email change
  const [newEmail, setNewEmail] = useState("");
  const [changingEmail, setChangingEmail] = useState(false);

  // Password change
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const updateInfo = useServerFn(updateMyProfileInfo);
  const updateEmail = useServerFn(changeMyEmail);
  const updatePassword = useServerFn(changeMyPassword);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

          const { data: p } = await supabase
        .from("profiles")
        .select("display_name, email, role, whatsapp")
        .eq("id", user.id)
        .single();

      setProfile(p);
      setName(p?.display_name ?? "");
      setNewEmail(p?.email ?? "");
      setWhatsapp(p?.whatsapp ?? "");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    setSavingProfile(true);
    try {
           await updateInfo({
        data: {
          display_name: name.trim(),
          whatsapp: whatsapp.trim(),
        },
      });
      swalSuccess("Profile updated");
      load();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    if (newEmail === profile?.email) {
      return toast.error("New email is same as current email");
    }
    if (!confirm(`Change email to ${newEmail}?`)) return;
    setChangingEmail(true);
    try {
      await updateEmail({ data: { new_email: newEmail } });
      swalSuccess("Email changed. Please login again.");
      setTimeout(() => supabase.auth.signOut().then(() => window.location.href = "/auth"), 1500);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setChangingEmail(false);
    }
  }

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword.length < 8) {
      return toast.error("New password must be at least 8 characters");
    }
    if (newPassword !== confirmPassword) {
      return toast.error("Passwords do not match");
    }
    setChangingPassword(true);
    try {
      await updatePassword({
        data: {
          current_password: currentPassword,
          new_password: newPassword,
        },
      });
      swalSuccess("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setChangingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0d4a3a]" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d4a3a] to-[#1b6e54] shadow-xl p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <UserIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">My Profile</h1>
            <p className="text-sm text-emerald-100/90 mt-0.5">
              Manage your account settings
            </p>
          </div>
        </div>
        {profile?.role === "admin" && (
          <span className="px-3 py-1 rounded-full bg-amber-400/20 text-amber-100 text-xs font-bold border border-amber-300/30">
            ADMIN
          </span>
        )}
      </div>

      {/* Profile Info */}
      <form onSubmit={handleSaveProfile} className="bg-white rounded-2xl shadow-xl border border-black/5 p-8 space-y-5">
        <h2 className="text-xl font-bold text-[#0d1b2a] flex items-center gap-2">
          <UserIcon className="w-5 h-5 text-[#0d4a3a]" /> Personal Info
        </h2>

        <Field label="Display Name">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your Name"
            className={inputCls}
            required
            maxLength={100}
          />
        </Field>

        <Field label="WhatsApp Number">
          <input
            type="tel"
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+91xxxxxxxxxx"
            className={inputCls}
            maxLength={20}
          />
        </Field>

        

        <button
          type="submit"
          disabled={savingProfile}
          className="w-full py-3.5 rounded-lg bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Save className="w-4 h-4" />
          {savingProfile ? "Saving..." : "SAVE PROFILE"}
        </button>
      </form>

      {/* Email Change */}
      <form onSubmit={handleChangeEmail} className="bg-white rounded-2xl shadow-xl border border-black/5 p-8 space-y-5">
        <h2 className="text-xl font-bold text-[#0d1b2a] flex items-center gap-2">
          <Mail className="w-5 h-5 text-[#0d4a3a]" /> Email Address
        </h2>

        <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800">
          Current email: <strong>{profile?.email}</strong>
        </div>

        <Field label="New Email">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="new@example.com"
            className={inputCls}
            required
          />
        </Field>

        <button
          type="submit"
          disabled={changingEmail || newEmail === profile?.email}
          className="w-full py-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Mail className="w-4 h-4" />
          {changingEmail ? "Changing..." : "CHANGE EMAIL"}
        </button>

        <p className="text-xs text-gray-500">
          ⚠️ You will be logged out after changing your email. Login with the new email.
        </p>
      </form>

      {/* Password Change */}
      <form onSubmit={handleChangePassword} className="bg-white rounded-2xl shadow-xl border border-black/5 p-8 space-y-5">
        <h2 className="text-xl font-bold text-[#0d1b2a] flex items-center gap-2">
          <Lock className="w-5 h-5 text-[#0d4a3a]" /> Change Password
        </h2>

        <Field label="Current Password">
          <div className="relative">
            <input
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Enter current password"
              className={inputCls + " pr-11"}
              required
            />
            <button
              type="button"
              onClick={() => setShowCurrent(!showCurrent)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showCurrent ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </Field>

        <Field label="New Password">
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              className={inputCls + " pr-11"}
              required
              minLength={8}
            />
            <button
              type="button"
              onClick={() => setShowNew(!showNew)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showNew ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </Field>

        <Field label="Confirm New Password">
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className={inputCls}
            required
          />
        </Field>

        <button
          type="submit"
          disabled={changingPassword}
          className="w-full py-3.5 rounded-lg bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold transition disabled:opacity-60 flex items-center justify-center gap-2"
        >
          <Lock className="w-4 h-4" />
          {changingPassword ? "Changing..." : "CHANGE PASSWORD"}
        </button>
      </form>
    </div>
  );
}

const inputCls =
  "w-full px-4 py-3 rounded-lg border border-gray-300 focus:border-[#0d4a3a] focus:ring-2 focus:ring-[#0d4a3a]/20 outline-none transition";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-sm font-medium text-[#0d1b2a] block mb-1.5">{label}</span>
      {children}
    </label>
  );
}