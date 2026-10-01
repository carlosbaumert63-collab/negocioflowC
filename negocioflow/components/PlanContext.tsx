"use client";
import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { supabase } from "../lib/supabaseClient";
import type { Business, BusinessRole, Subscription } from "../lib/types";
import { isProSub, isPlusSub, daysUntil } from "../lib/plan";

interface PlanCtx {
  business: Business;
  subscription: Subscription | null;
  isPro: boolean;
  isPlus: boolean;
  planLabel: "Free" | "Pro" | "Plus";
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
    let sub = (data as Subscription) || null;

    // El plan Plus desbloquea Pro en hasta 5 negocios de la misma cuenta,
    // aunque la suscripción Plus esté asociada a otro negocio del dueño.
    // Si este negocio no tiene su propia suscripción Pro/Plus activa,
    // revisamos si el dueño tiene un Plus activo en algún otro negocio suyo.
    if (!isProSub(sub)) {
      const { data: ownerBusinesses } = await supabase
        .from("businesses")
        .select("id")
        .eq("user_id", business.user_id);
      const ids = (ownerBusinesses || []).map((b: { id: string }) => b.id);
      if (ids.length > 1) {
        const { data: plusSubs } = await supabase
          .from("subscriptions")
          .select("*")
          .in("business_id", ids)
          .like("plan", "plus%")
          .order("expires_at", { ascending: false, nullsFirst: false });
        const activePlus = (plusSubs as Subscription[] | null)?.find((s) => isPlusSub(s));
        if (activePlus) sub = activePlus;
      }
    }

    setSubscription(sub);
  }, [business.id, business.user_id]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const isPro = isProSub(subscription);
  const isPlus = isPlusSub(subscription);
  const planLabel: "Free" | "Pro" | "Plus" = isPlus ? "Plus" : isPro ? "Pro" : "Free";
  const daysLeft = isPro ? daysUntil(subscription?.expires_at) : null;

  return (
    <Ctx.Provider
      value={{
        business,
        subscription,
        isPro,
        isPlus,
        planLabel,
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
