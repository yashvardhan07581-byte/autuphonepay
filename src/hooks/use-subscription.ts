import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type SubscriptionState = {
  loading: boolean;
  isActive: boolean;
  plan: string | null;
  expiresAt: string | null;
  daysLeft: number;
};

export function useSubscription(): SubscriptionState {
  const [state, setState] = useState<SubscriptionState>({
    loading: true,
    isActive: false,
    plan: null,
    expiresAt: null,
    daysLeft: 0,
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          if (alive) setState((s) => ({ ...s, loading: false }));
          return;
        }

        const { data } = await supabase
          .from("profiles")
          .select("subscription_plan, subscription_status, subscription_expires_at")
          .eq("id", user.id)
          .single();

        const expiresAt = data?.subscription_expires_at ?? null;
        const isActive =
          data?.subscription_status === "active" &&
          expiresAt !== null &&
          new Date(expiresAt) > new Date();

        const daysLeft = expiresAt
          ? Math.max(
              0,
              Math.ceil(
                (new Date(expiresAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              )
            )
          : 0;

        if (alive) {
          setState({
            loading: false,
            isActive,
            plan: data?.subscription_plan ?? null,
            expiresAt,
            daysLeft,
          });
        }
      } catch {
        if (alive) setState((s) => ({ ...s, loading: false }));
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  return state;
}