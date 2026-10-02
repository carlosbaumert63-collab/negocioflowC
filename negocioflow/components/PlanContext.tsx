"use client";
import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from "react";
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
  const [loaded, setLoaded] = useState(false);
  const requestSeq = useRef(0);

  const refreshSubscription = useCallback(async () => {
    const seq = ++requestSeq.current;

    // La base de datos resuelve el plan efectivo del negocio: su propia
    // suscripción, o un Plus activo del dueño en otro de sus negocios. Se hace
    // en el servidor porque un vendedor no tiene permiso para ver los otros
    // negocios del dueño, y sin esto vería "Free" en un negocio que es Pro.
    let sub: Subscription | null = null;
    const { data: rpcData, error: rpcError } = await supabase.rpc("effective_subscription", {
      p_business_id: business.id,
    });
    if (!rpcError) {
      const row = Array.isArray(rpcData) ? rpcData[0] : rpcData;
      sub = row ? ({ flow_customer_id: null, updated_at: "", ...row } as Subscription) : null;
    } else {
      // Respaldo: solo la suscripción propia del negocio.
      const { data } = await supabase.from("subscriptions").select("*").eq("business_id", business.id).maybeSingle();
      sub = (data as Subscription) || null;
    }

    // Si mientras tanto se pidió una actualización más nueva, no la pisamos.
    if (seq !== requestSeq.current) return;
    setSubscription(sub);
    setLoaded(true);
  }, [business.id]);

  useEffect(() => {
    refreshSubscription();
  }, [refreshSubscription]);

  const isPro = isProSub(subscription);
  const isPlus = isPlusSub(subscription);
  const planLabel: "Free" | "Pro" | "Plus" = isPlus ? "Plus" : isPro ? "Pro" : "Free";
  const daysLeft = isPro ? daysUntil(subscription?.expires_at) : null;

  // Hasta saber el plan no mostramos nada: si no, un usuario Pro vería por
  // un instante la versión Free (avisos de límite, botones de pago).
  if (!loaded) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">Cargando…</div>;
  }

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
