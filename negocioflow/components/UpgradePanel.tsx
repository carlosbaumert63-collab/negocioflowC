"use client";
import React, { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP } from "../lib/types";
import { usePlan } from "./PlanContext";

const PRO_FEATURES = [
  "Ventas y productos ilimitados",
  "Inventario completo",
  "Reportes avanzados",
  "Flujo de caja",
  "Clientes y proveedores",
  "Exportación CSV / PDF",
  "Alertas inteligentes",
];

const PLUS_FEATURES = ["Todo lo del plan Pro", "Hasta 5 negocios en tu cuenta", "Se aplica automáticamente a todos ellos"];

type PlanId = "pro_monthly" | "pro_annual" | "plus_monthly" | "plus_annual";

// Precios de respaldo; los reales se leen de la tabla `plans` (la misma que
// usa el servidor para cobrar), así lo que se muestra siempre es lo que se cobra.
const FALLBACK_PRICES: Record<PlanId, number> = {
  pro_monthly: 6990,
  pro_annual: 59990,
  plus_monthly: 14990,
  plus_annual: 149990,
};

function savingsPct(monthly: number, annual: number): number {
  if (!monthly || !annual) return 0;
  // Redondeamos hacia abajo: nunca prometer más ahorro del real.
  return Math.max(0, Math.floor((1 - annual / (monthly * 12)) * 100));
}

export default function UpgradePanel({ renewal }: { renewal?: boolean }) {
  const { business, planLabel } = usePlan();
  const [provider, setProvider] = useState<"flow" | "mp">("flow");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [prices, setPrices] = useState<Record<PlanId, number>>(FALLBACK_PRICES);

  useEffect(() => {
    let active = true;
    supabase
      .from("plans")
      .select("id, price_clp")
      .then(({ data }) => {
        if (!active || !data) return;
        const next = { ...FALLBACK_PRICES };
        for (const row of data as { id: string; price_clp: number }[]) {
          if (row.id in next && row.price_clp > 0) next[row.id as PlanId] = row.price_clp;
        }
        setPrices(next);
      });
    return () => {
      active = false;
    };
  }, []);

  const proSavings = savingsPct(prices.pro_monthly, prices.pro_annual);
  const plusSavings = savingsPct(prices.plus_monthly, prices.plus_annual);

  async function checkout(planId: PlanId) {
    setError(null);
    setLoadingPlan(planId);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) throw new Error("Debes iniciar sesión de nuevo.");

      const res = await fetch(`/api/${provider}/checkout`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ planId, businessId: business.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "No se pudo iniciar el pago.");
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message || "Error inesperado.");
      setLoadingPlan(null);
    }
  }

  return (
    <div>
      <div className="mb-4">
        <div className="text-sm font-semibold mb-2">
          {renewal ? `Renueva tu plan ${planLabel}` : "Pasa a NegocioFlow Pro"}
        </div>
        <ul className="space-y-1.5">
          {PRO_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-muted">
              <Check size={14} className="text-brand-600 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <div className="flex gap-1.5 mb-4">
        <button
          onClick={() => setProvider("flow")}
          className={`flex-1 text-xs py-2 rounded-lg border font-medium ${
            provider === "flow" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted"
          }`}
        >
          Flow (tarjetas / transferencia)
        </button>
        <button
          onClick={() => setProvider("mp")}
          className={`flex-1 text-xs py-2 rounded-lg border font-medium ${
            provider === "mp" ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted"
          }`}
        >
          Mercado Pago
        </button>
      </div>

      {error && <div className="text-xs text-red-600 mb-3">{error}</div>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={() => checkout("pro_monthly")}
          disabled={loadingPlan !== null}
          className="border border-line rounded-xl p-4 text-left hover:border-brand-400 transition disabled:opacity-60"
        >
          <div className="text-xs text-muted mb-1">Mensual</div>
          <div className="text-lg font-bold mb-2">{fmtCLP(prices.pro_monthly)}</div>
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium bg-ink text-white rounded-lg py-1.5">
            {loadingPlan === "pro_monthly" && <Loader2 size={12} className="animate-spin" />}
            Elegir mensual
          </div>
        </button>
        <button
          onClick={() => checkout("pro_annual")}
          disabled={loadingPlan !== null}
          className="border-2 border-brand-500 rounded-xl p-4 text-left relative hover:bg-brand-50 transition disabled:opacity-60"
        >
          <div className="absolute -top-2 right-3 bg-brand-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
            Ahorra {proSavings}%
          </div>
          <div className="text-xs text-muted mb-1">Anual</div>
          <div className="text-lg font-bold mb-2">{fmtCLP(prices.pro_annual)}</div>
          <div className="flex items-center justify-center gap-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg py-1.5">
            {loadingPlan === "pro_annual" && <Loader2 size={12} className="animate-spin" />}
            Elegir anual
          </div>
        </button>
      </div>

      <div className="mt-6 pt-5 border-t border-line">
        <div className="text-sm font-semibold mb-2">¿Tienes más de un local? Pasa a Plus</div>
        <ul className="space-y-1.5 mb-4">
          {PLUS_FEATURES.map((f) => (
            <li key={f} className="flex items-center gap-2 text-sm text-muted">
              <Check size={14} className="text-amber-600 flex-shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => checkout("plus_monthly")}
            disabled={loadingPlan !== null}
            className="border border-line rounded-xl p-4 text-left hover:border-amber-400 transition disabled:opacity-60"
          >
            <div className="text-xs text-muted mb-1">Mensual</div>
            <div className="text-lg font-bold mb-2">{fmtCLP(prices.plus_monthly)}</div>
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium bg-ink text-white rounded-lg py-1.5">
              {loadingPlan === "plus_monthly" && <Loader2 size={12} className="animate-spin" />}
              Elegir mensual
            </div>
          </button>
          <button
            onClick={() => checkout("plus_annual")}
            disabled={loadingPlan !== null}
            className="border-2 border-amber-500 rounded-xl p-4 text-left relative hover:bg-amber-50 transition disabled:opacity-60"
          >
            <div className="absolute -top-2 right-3 bg-amber-600 text-white text-[10px] font-semibold px-2 py-0.5 rounded-full">
              Ahorra {plusSavings}%
            </div>
            <div className="text-xs text-muted mb-1">Anual</div>
            <div className="text-lg font-bold mb-2">{fmtCLP(prices.plus_annual)}</div>
            <div className="flex items-center justify-center gap-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg py-1.5">
              {loadingPlan === "plus_annual" && <Loader2 size={12} className="animate-spin" />}
              Elegir anual
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
