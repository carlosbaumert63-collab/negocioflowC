"use client";
import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts";
import { RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Business } from "../lib/types";
import { localISODate, monthLabel } from "../lib/dates";
import { friendlyDbError } from "../lib/plan";
import ProGate from "./ProGate";
import OwnerGate from "./OwnerGate";

interface MonthFlow {
  key: string;
  month: string;
  entradas: number;
  salidas: number;
  gastos: number;
  compras: number;
  neto: number;
}

function compactCLP(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function FlujoCajaInner({ business }: { business: Business }) {
  const [rows, setRows] = useState<MonthFlow[]>([]);
  const [receivable, setReceivable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      const { data, error: err } = await supabase.rpc("cash_flow_months", {
        p_business_id: business.id,
        p_today: localISODate(),
        p_months: 6,
      });
      if (!active) return;
      if (err) {
        setError(friendlyDbError(err.message));
        setLoading(false);
        return;
      }
      const d = data as any;
      setRows(
        (d.months || []).map((m: any) => {
          const entradas = Number(m.entradas || 0);
          const gastos = Number(m.gastos || 0);
          const compras = Number(m.compras || 0);
          const label = monthLabel(`${m.month}-01`);
          return {
            key: m.month,
            month: label.slice(0, 3),
            entradas,
            gastos,
            compras,
            salidas: gastos + compras,
            neto: entradas - gastos - compras,
          };
        })
      );
      setReceivable(Number(d.receivable || 0));
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [business.id, reloadKey]);

  const totalEntradas = rows.reduce((s, r) => s + r.entradas, 0);
  const totalSalidas = rows.reduce((s, r) => s + r.salidas, 0);
  const netoTotal = totalEntradas - totalSalidas;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Flujo de caja</h1>
      <p className="text-sm text-muted mb-6">
        Dinero que entró y salió, últimos 6 meses. Las ventas al fiado cuentan cuando el cliente paga.
      </p>

      {error ? (
        <div className="text-sm text-center py-10">
          <div className="text-red-600 mb-3">{error}</div>
          <button onClick={() => setReloadKey((k) => k + 1)} className="inline-flex items-center gap-1.5 underline">
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      ) : loading ? (
        <div className="text-sm text-muted py-8 text-center">Cargando…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <Tile label="Entradas (6 meses)" value={fmtCLP(totalEntradas)} tone="good" />
            <Tile label="Salidas (6 meses)" value={fmtCLP(totalSalidas)} tone="bad" />
            <Tile label="Flujo neto" value={fmtCLP(netoTotal)} tone={netoTotal >= 0 ? "good" : "bad"} />
            <Tile label="Por cobrar (fiado)" value={fmtCLP(receivable)} />
          </div>

          <div className="bg-white border border-line rounded-xl p-5 mb-6">
            <div className="text-sm font-semibold mb-3">Entradas vs. salidas por mes</div>
            <div className="h-72" role="img" aria-label="Gráfico de barras de entradas y salidas de dinero por mes">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rows} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barGap={2}>
                  <CartesianGrid vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#64748B" }} tickLine={false} axisLine={{ stroke: "#E2E8F0" }} />
                  <YAxis tickFormatter={compactCLP} tick={{ fontSize: 10, fill: "#64748B" }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip
                    cursor={{ fill: "#F1F5F9" }}
                    formatter={(v: number, name: string) => [fmtCLP(v), name]}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="entradas" name="Entradas" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  <Bar dataKey="salidas" name="Salidas" fill="#DC2626" radius={[4, 4, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Tabla: los mismos números, legibles sin depender del color. */}
          <div className="bg-white border border-line rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-muted text-left border-b border-line">
                  <th className="px-4 py-2.5 font-medium">Mes</th>
                  <th className="px-4 py-2.5 font-medium text-right">Entradas</th>
                  <th className="px-4 py-2.5 font-medium text-right">Gastos</th>
                  <th className="px-4 py-2.5 font-medium text-right">Compras</th>
                  <th className="px-4 py-2.5 font-medium text-right">Neto</th>
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr key={r.key} className="border-b border-line last:border-0">
                    <td className="px-4 py-2.5 capitalize">{monthLabel(`${r.key}-01`)}</td>
                    <td className="px-4 py-2.5 text-right">{fmtCLP(r.entradas)}</td>
                    <td className="px-4 py-2.5 text-right">{fmtCLP(r.gastos)}</td>
                    <td className="px-4 py-2.5 text-right">{fmtCLP(r.compras)}</td>
                    <td className={`px-4 py-2.5 text-right font-medium ${r.neto >= 0 ? "text-brand-600" : "text-red-600"}`}>
                      {fmtCLP(r.neto)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function Tile({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-lg font-bold mt-1 ${tone === "good" ? "text-brand-600" : tone === "bad" ? "text-red-600" : "text-ink"}`}>
        {value}
      </div>
    </div>
  );
}

export default function FlujoCaja({ business }: { business: Business }) {
  return (
    <OwnerGate title="Flujo de caja">
      <ProGate title="Flujo de caja" description="Mira cuánto dinero entra y sale de tu negocio.">
        <FlujoCajaInner business={business} />
      </ProGate>
    </OwnerGate>
  );
}
