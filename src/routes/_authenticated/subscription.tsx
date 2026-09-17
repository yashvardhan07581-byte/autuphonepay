import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  createSubscriptionOrder,
  checkSubscriptionOrderStatus,
  syncMyPendingOrders,
} from "@/lib/subscription.functions";
import { toast } from "sonner";
import { swalSuccess } from "@/lib/swal";
import {
  CreditCard, Check, Sparkles, Loader2, Crown, Zap, Rocket,
  AlertCircle, X, Copy, QrCode, RefreshCw, ExternalLink,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/subscription")({
  head: () => ({ meta: [{ title: "AutoUPI | Subscription" }] }),
  component: SubscriptionPage,
});

type Plan = {
  id: "basic" | "pro" | "yearly";
  name: string;
  price: number;
  days: number;
  icon: any;
  color: string;
  features: string[];
  popular?: boolean;
};

const PLANS: Plan[] = [
  {
    id: "basic",
    name: "Basic",
    price: 99,
    days: 30,
    icon: Zap,
    color: "blue",
    features: [
      "1,000 payment orders/month",
      "Basic webhook support",
      "Email notifications",
      "Standard support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 299,
    days: 60,
    icon: Rocket,
    color: "purple",
    popular: true,
    features: [
      "10,000 payment orders/month",
      "Priority webhook delivery",
      "Custom domain support",
      "Email + Chat support",
      "Advanced analytics",
    ],
  },
  {
    id: "yearly",
    name: "Yearly",
    price: 999,
    days: 200,
    icon: Crown,
    color: "emerald",
    features: [
      "Unlimited payment orders",
      "Priority webhook delivery",
      "Custom domain support",
      "24/7 Priority support",
      "Advanced analytics",
      "Early access to new features",
    ],
  },
];

type Profile = {
  subscription_plan: string | null;
  subscription_status: string;
  subscription_started_at: string | null;
  subscription_expires_at: string | null;
};

type OrderData = {
  order_id: string;
  payable_amount: number;
  payment_url: string;
  upi_uri: string;
  qr_base64: string | null;
  expires_at: string;
};

function SubscriptionPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [activeOrder, setActiveOrder] = useState<{ order: OrderData; plan: Plan } | null>(null);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_plan, subscription_status, subscription_started_at, subscription_expires_at")
      .eq("id", user.id)
      .single();
    if (error) toast.error(error.message);
    else setProfile(data);
    setLoading(false);
  }

  async function buyPlan(plan: Plan) {
    setBuying(plan.id);
    try {
      const order = await createSubscriptionOrder({ data: { plan: plan.id } });
      setActiveOrder({ order: order as OrderData, plan });
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create order");
    } finally {
      setBuying(null);
    }
  }

  async function syncPending() {
    setSyncing(true);
    try {
      const result = await syncMyPendingOrders();
      const r = result as { checked: number; activated: number };
      if (r.activated > 0) {
        swalSuccess(`${r.activated} subscription(s) activated!`);
        load();
      } else if (r.checked > 0) {
        toast.info(`${r.checked} pending order(s) checked, none paid yet`);
      } else {
        toast.info("No pending orders");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSyncing(false);
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="rounded-2xl bg-gradient-to-r from-[#0d4a3a] to-[#1b6e54] shadow-xl p-6 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-white/15 flex items-center justify-center">
            <CreditCard className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Subscription</h1>
            <p className="text-sm text-emerald-100/90 mt-0.5">
              Choose a plan that fits your business
            </p>
          </div>
        </div>
        <button
          onClick={syncPending}
          disabled={syncing}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/15 hover:bg-white/25 text-white font-semibold text-sm transition backdrop-blur-sm disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? "animate-spin" : ""}`} />
          {syncing ? "Checking..." : "Verify Pending"}
        </button>
      </div>

      {/* Current status */}
      {!loading && profile && (
        <div
          className={`rounded-2xl shadow-lg border p-6 ${
            isActive
              ? "bg-gradient-to-r from-emerald-50 to-emerald-100/50 border-emerald-200"
              : "bg-gradient-to-r from-gray-50 to-gray-100/50 border-gray-200"
          }`}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-4">
              <div
                className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                  isActive ? "bg-emerald-500" : "bg-gray-400"
                }`}
              >
                {isActive ? (
                  <Check className="w-6 h-6 text-white" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <div className="text-sm text-gray-600">Current Plan</div>
                <div className="text-xl font-bold text-[#0d1b2a]">
                  {isActive && profile.subscription_plan
                    ? profile.subscription_plan.toUpperCase()
                    : "No Active Plan"}
                </div>
              </div>
            </div>

            {isActive ? (
              <div className="flex items-center gap-6">
                <div>
                  <div className="text-xs text-gray-600">Days Left</div>
                  <div className="text-2xl font-bold text-emerald-600">{daysLeft}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-600">Expires</div>
                  <div className="text-sm font-semibold text-[#0d1b2a]">
                    {profile.subscription_expires_at
                      ? new Date(profile.subscription_expires_at).toLocaleDateString(
                          "en-IN",
                          { day: "numeric", month: "short", year: "numeric" }
                        )
                      : "—"}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">
                Buy a plan to unlock all features
              </div>
            )}
          </div>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {PLANS.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            currentPlan={profile?.subscription_plan ?? null}
            isActive={!!isActive}
            buying={buying === plan.id}
            onBuy={() => buyPlan(plan)}
          />
        ))}
      </div>

      {/* Footer note */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6">
        <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          How subscription works
        </h3>
        <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
          <li>Payment via UPI (PhonePe / GPay / Paytm) — instant activation</li>
          <li>Plan automatically activates after payment confirmation</li>
          <li>You can upgrade or renew anytime</li>
          <li>Subscription expires automatically after the plan duration</li>
        </ul>
      </div>

      {/* QR Payment Modal */}
      {activeOrder && (
        <PaymentModal
          order={activeOrder.order}
          plan={activeOrder.plan}
          onClose={() => setActiveOrder(null)}
          onSuccess={() => {
            setActiveOrder(null);
            load();
          }}
        />
      )}
    </div>
  );
}

function PlanCard({
  plan,
  currentPlan,
  isActive,
  buying,
  onBuy,
}: {
  plan: Plan;
  currentPlan: string | null;
  isActive: boolean;
  buying: boolean;
  onBuy: () => void;
}) {
  const Icon = plan.icon;

  const colorMap: any = {
    blue: {
      bg: "bg-blue-500",
      text: "text-blue-600",
      border: "border-blue-200",
      btn: "bg-blue-600 hover:bg-blue-700",
    },
    purple: {
      bg: "bg-purple-500",
      text: "text-purple-600",
      border: "border-purple-300",
      btn: "bg-purple-600 hover:bg-purple-700",
    },
    emerald: {
      bg: "bg-emerald-500",
      text: "text-emerald-600",
      border: "border-emerald-200",
      btn: "bg-emerald-600 hover:bg-emerald-700",
    },
  };

  const colors = colorMap[plan.color];
  const isCurrent = currentPlan === plan.id && isActive;

  return (
    <div
      className={`relative bg-white rounded-2xl shadow-xl border-2 ${
        plan.popular ? colors.border : "border-gray-100"
      } p-6 flex flex-col transition-transform hover:-translate-y-1 hover:shadow-2xl`}
    >
      {plan.popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold shadow-lg">
            <Sparkles className="w-3 h-3" /> MOST POPULAR
          </span>
        </div>
      )}

      {isCurrent && (
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
            <Check className="w-3 h-3" /> CURRENT
          </span>
        </div>
      )}

      <div className={`w-14 h-14 rounded-2xl ${colors.bg} flex items-center justify-center shadow-lg mb-4`}>
        <Icon className="w-7 h-7 text-white" />
      </div>

      <h3 className="text-xl font-bold text-[#0d1b2a]">{plan.name}</h3>
      <p className="text-sm text-gray-500 mt-1">For {plan.days} days</p>

      <div className="mt-4 mb-6">
        <span className="text-4xl font-extrabold text-[#0d1b2a]">₹{plan.price}</span>
        <span className="text-gray-500 text-sm ml-1">/ {plan.days} days</span>
      </div>

      <ul className="space-y-3 flex-1 mb-6">
        {plan.features.map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <Check className={`w-4 h-4 mt-0.5 shrink-0 ${colors.text}`} />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={onBuy}
        disabled={buying || isCurrent}
        className={`w-full py-3.5 rounded-xl text-white font-bold tracking-wide transition disabled:opacity-60 flex items-center justify-center gap-2 ${
          isCurrent ? "bg-gray-400 cursor-not-allowed" : colors.btn
        }`}
      >
        {buying ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" /> Creating order...
          </>
        ) : isCurrent ? (
          <>
            <Check className="w-4 h-4" /> Current Plan
          </>
        ) : (
          <>
            <CreditCard className="w-4 h-4" />
            {currentPlan ? "Upgrade / Renew" : "Buy Now"}
          </>
        )}
      </button>
    </div>
  );
}

function PaymentModal({
  order,
  plan,
  onClose,
  onSuccess,
}: {
  order: OrderData;
  plan: Plan;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [status, setStatus] = useState<"pending" | "paid" | "expired" | "failed">("pending");
  const [pollCount, setPollCount] = useState(0);
  const [polling, setPolling] = useState(true);
  const [checking, setChecking] = useState(false);
  const [expirySeconds, setExpirySeconds] = useState(() => {
    const diff = Math.floor(
      (new Date(order.expires_at).getTime() - Date.now()) / 1000
    );
    return Math.max(0, diff);
  });
  const [copied, setCopied] = useState(false);

  const intervalRef = useRef<number | null>(null);
  const expiryRef = useRef<number | null>(null);
  const paidHandled = useRef(false);

  const MAX_POLLS = 100;

  useEffect(() => {
    expiryRef.current = window.setInterval(() => {
      setExpirySeconds((s) => Math.max(0, s - 1));
    }, 1000);
    return () => {
      if (expiryRef.current) clearInterval(expiryRef.current);
    };
  }, []);

  useEffect(() => {
    if (!polling) return;

    async function poll() {
      try {
        const result = await checkSubscriptionOrderStatus({
          data: { order_id: order.order_id },
        });
        const st = (result as any)?.status ?? "pending";

        if (st === "paid") {
          if (paidHandled.current) return;
          paidHandled.current = true;
          setStatus("paid");
          setPolling(false);
          swalSuccess("Payment received! Subscription activated.");
          setTimeout(() => onSuccess(), 1500);
        } else if (st === "expired") {
          setStatus("expired");
          setPolling(false);
        } else if (st === "failed") {
          setStatus("failed");
          setPolling(false);
        } else {
          setPollCount((c) => c + 1);
        }
      } catch {
        // keep polling on transient errors
      }
    }

    poll();
    intervalRef.current = window.setInterval(poll, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [polling, order.order_id]);

  useEffect(() => {
    if (pollCount >= MAX_POLLS && polling) setPolling(false);
  }, [pollCount, polling]);

  async function manualCheck() {
    setChecking(true);
    try {
      const result = await checkSubscriptionOrderStatus({
        data: { order_id: order.order_id },
      });
      const st = (result as any)?.status ?? "pending";
      if (st === "paid") {
        if (paidHandled.current) return;
        paidHandled.current = true;
        setStatus("paid");
        setPolling(false);
        swalSuccess("Payment confirmed!");
        setTimeout(() => onSuccess(), 1500);
      } else if (st === "expired") {
        setStatus("expired");
        setPolling(false);
      } else if (st === "failed") {
        setStatus("failed");
        setPolling(false);
      } else {
        toast.info("Payment not yet received. Try again in a few seconds.");
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setChecking(false);
    }
  }

  function copyUpiLink() {
    navigator.clipboard.writeText(order.upi_uri);
    setCopied(true);
    toast.success("UPI link copied");
    setTimeout(() => setCopied(false), 2000);
  }

  const minutes = Math.floor(expirySeconds / 60);
  const seconds = expirySeconds % 60;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md my-8 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {status === "paid" ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
              <Check className="w-10 h-10 text-emerald-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#0d1b2a] mb-2">Payment Successful!</h2>
            <p className="text-sm text-gray-600 mb-1">
              Your <strong>{plan.name}</strong> plan is now active
            </p>
            <p className="text-xs text-gray-500">Activated for {plan.days} days</p>
            <div className="mt-6">
              <Loader2 className="w-5 h-5 animate-spin text-[#0d4a3a] mx-auto" />
              <p className="text-xs text-gray-500 mt-2">Refreshing...</p>
            </div>
          </div>
        ) : status === "expired" ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-10 h-10 text-gray-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#0d1b2a] mb-2">Order Expired</h2>
            <p className="text-sm text-gray-600 mb-6">
              Payment window closed. Please try again.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-lg bg-[#0d4a3a] text-white font-bold"
            >
              Close
            </button>
          </div>
        ) : status === "failed" ? (
          <div className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <X className="w-10 h-10 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-[#0d1b2a] mb-2">Payment Failed</h2>
            <p className="text-sm text-gray-600 mb-6">
              Something went wrong. Please try again.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 rounded-lg bg-[#0d4a3a] text-white font-bold"
            >
              Close
            </button>
          </div>
        ) : (
          <div className="p-6">
            <div className="text-center mb-5">
              <h2 className="text-xl font-bold text-[#0d1b2a]">Scan to Pay</h2>
              <p className="text-sm text-gray-500 mt-1">
                {plan.name} Plan · ₹{plan.price}
              </p>
            </div>

            <div className="bg-gradient-to-r from-[#0d4a3a] to-[#1b6e54] rounded-xl p-4 text-center mb-5">
              <div className="text-xs text-emerald-100/80">Amount to pay</div>
              <div className="text-3xl font-extrabold text-white mt-1">
                ₹{order.payable_amount}
              </div>
            </div>

            {order.qr_base64 ? (
              <div className="flex justify-center mb-4">
                <div className="bg-white p-3 rounded-xl border-2 border-gray-100 shadow-md">
                  <img
                    src={order.qr_base64}
                    alt="Payment QR"
                    className="w-56 h-56"
                  />
                </div>
              </div>
            ) : (
              <div className="flex justify-center mb-4">
                <div className="w-56 h-56 rounded-xl bg-gray-100 flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-gray-400" />
                </div>
              </div>
            )}

            <p className="text-center text-xs text-gray-500 mb-4">
              Scan with any UPI app (PhonePe, GPay, Paytm)
            </p>

            <button
              onClick={copyUpiLink}
              className="w-full mb-3 px-4 py-3 rounded-lg border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center justify-center gap-2 transition"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" /> Copied!
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copy UPI Link
                </>
              )}
            </button>

            <a
              href={order.upi_uri}
              className="w-full mb-5 px-4 py-3 rounded-lg bg-[#0d4a3a] text-white font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#0a3d30] transition"
            >
              <ExternalLink className="w-4 h-4" /> Open in UPI App
            </a>

            <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50 border border-gray-100">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-[#0d4a3a]" />
                <span className="text-xs font-medium text-gray-700">
                  Waiting for payment...
                </span>
              </div>
              <span className="text-xs font-mono text-gray-500">
                {minutes}:{seconds.toString().padStart(2, "0")}
              </span>
            </div>

            {!polling && pollCount >= MAX_POLLS && (
              <p className="text-xs text-amber-600 text-center mt-3">
                Still waiting? If you already paid, click "Check Status"
              </p>
            )}

            <button
              onClick={manualCheck}
              disabled={checking}
              className="w-full mt-3 py-2.5 rounded-lg border border-[#0d4a3a] text-[#0d4a3a] font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#0d4a3a]/5 transition disabled:opacity-60"
            >
              <RefreshCw className={`w-4 h-4 ${checking ? "animate-spin" : ""}`} />
              {checking ? "Checking..." : "Check Status"}
            </button>

            <p className="text-[11px] text-gray-400 text-center mt-3">
              Order ID: {order.order_id}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}