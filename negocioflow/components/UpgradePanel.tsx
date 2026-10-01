"use client";
import React, { useState } from "react";
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

export default function UpgradePanel({ renewal }: { renewal?: boolean }) {
  const { business } = usePlan();
  const [provider, setProvider] = useState<"flow" | "mp">("flow");
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
          {renewal ? "Renueva tu plan Pro" : "Pasa a NegocioFlow Pro"}
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
          <div className="text-lg font-bold mb-2">{fmtCLP(6990)}</div>
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
            Ahorra 28%
          </div>
          <div className="text-xs text-muted mb-1">Anual</div>
          <div className="text-lg font-bold mb-2">{fmtCLP(59990)}</div>
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
            <div className="text-lg font-bold mb-2">{fmtCLP(14990)}</div>
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
              Ahorra 16%
            </div>
            <div className="text-xs text-muted mb-1">Anual</div>
            <div className="text-lg font-bold mb-2">{fmtCLP(149990)}</div>
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
