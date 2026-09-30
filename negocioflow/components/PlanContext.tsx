"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Business, BusinessRole, Subscription } from "../lib/types";
import { isProSub, daysUntil } from "../lib/plan";

interface PlanCtx {
  business: Business;
  subscription: Subscription | null;
  isPro: boolean;
  daysLeft: number | null;
  showUpgrade: boolean;
  role: BusinessRole;
  isOwner: boolean;
  goToPlan: () => void;
  closeUpgrade: () => void;
  refreshSubscription: () => Promise<void>;
}

const Ctx = createContext<PlanCtx | null>(null);

export function PlanProvider({
  business,
  role = "owner",
  children,
}: {
  business: Business;
  role?: BusinessRole;
  children: React.ReactNode;
}) {
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [showUpgrade, setShowUpgrade] = useState(false);

  const refreshSubscription = useCallback(async () => {
    const { data } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("business_id", business.id)
      .maybeSingle();
    setSubscription((data as Subscription) || null);
  }, [business.id]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const isPro = isProSub(subscription);
  const daysLeft = subscription?.plan?.startsWith("pro") ? daysUntil(subscription.expires_at) : null;

  return (
    <Ctx.Provider
      value={{
        business,
        subscription,
        isPro,
        daysLeft,
        showUpgrade,
        role,
        isOwner: role === "owner",
        goToPlan: () => setShowUpgrade(true),
        closeUpgrade: () => setShowUpgrade(false),
        refreshSubscription,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function usePlan(): PlanCtx {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("usePlan debe usarse dentro de <PlanProvider>");
  return ctx;
}
