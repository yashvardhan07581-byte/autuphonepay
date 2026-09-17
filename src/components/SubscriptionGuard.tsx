import { Link } from "@tanstack/react-router";
import { Lock, Sparkles, Loader2 } from "lucide-react";
import type { ReactNode } from "react";
import { useSubscription } from "@/hooks/use-subscription";

export function SubscriptionGuard({ children }: { children: ReactNode }) {
  const { loading, isActive, plan } = useSubscription();

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-[#0d4a3a]" />
      </div>
    );
  }

  if (!isActive) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-xl border border-amber-200 overflow-hidden">
          <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
              <Lock className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">Feature Locked</h2>
              <p className="text-sm text-white/90 mt-0.5">
                Active subscription required
              </p>
            </div>
          </div>

          <div className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-5">
              <Sparkles className="w-10 h-10 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-[#0d1b2a] mb-2">
              Unlock Payment Features
            </h3>
            <p className="text-gray-600 mb-6 max-w-md mx-auto">
              To generate QR codes, create orders, and use the payment API, you need an
              active subscription plan.
            </p>

            <div className="bg-gray-50 rounded-xl p-4 mb-6 text-left max-w-md mx-auto">
              <p className="text-sm text-gray-700 font-medium mb-2">
                With an active plan you get:
              </p>
              <ul className="text-sm text-gray-600 space-y-1.5">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Unlimited QR code generation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Payment API access
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Webhook notifications
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Order history & analytics
                </li>
              </ul>
            </div>

            <Link
              to="/subscription"
              className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#0d4a3a] hover:bg-[#0a3d30] text-white font-bold tracking-wide transition shadow-lg"
            >
              <Sparkles className="w-5 h-5" />
              View Subscription Plans
            </Link>

            {plan && (
              <p className="text-xs text-gray-500 mt-4">
                Previous plan: <strong>{plan.toUpperCase()}</strong> (expired)
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}