"use client";
import React, { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Business } from "../lib/types";
import { monthRange } from "../lib/dates";
import ProGate from "./ProGate";
import OwnerGate from "./OwnerGate";

interface MonthFlow {
  month: string;
  entradas: number;
  salidas: number;
  neto: number;
}

function FlujoCajaInner({ business }: { business: Business }) {
  const [rows, setRows] = useState<MonthFlow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const months = Array.from({ length: 6 }, (_, i) => monthRange(-(5 - i)));

      const results = await Promise.all(
        months.map(async (m) => {
          const [salesRes, expensesRes, purchasesRes] = await Promise.all([
            supabase
              .from("sales")
              .select("total")
              .eq("business_id", business.id)
              .gte("sale_date", m.start)
              .lte("sale_date", m.end),
            supabase
              .from("expenses")
              .select("amount")
              .eq("business_id", business.id)
              .gte("expense_date", m.start)
              .lte("expense_date", m.end),
            supabase
              .from("purchases")
              .select("total")
              .eq("business_id", business.id)
              .gte("purchase_date", m.start)
              .lte("purchase_date", m.end),
          ]);
          const entradas = (salesRes.data || []).reduce((s: number, r: any) => s + Number(r.total), 0);
          const salidas =
            (expensesRes.data || []).reduce((s: number, r: any) => s + Number(r.amount), 0) +
            (purchasesRes.data || []).reduce((s: number, r: any) => s + Number(r.total), 0);
          return {
            month: m.label.slice(0, 3),
            entradas,
            salidas,
            neto: entradas - salidas,
          };
        })
      );

      if (!active) return;
      setRows(results);
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [business.id]);

  const totalEntradas = rows.reduce((s, r) => s + r.entradas, 0);
  const totalSalidas = rows.reduce((s, r) => s + r.salidas, 0);
  const netoTotal = totalEntradas - totalSalidas;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Flujo de caja</h1>
      <p className="text-sm text-muted mb-6">Entradas y salidas de dinero, últimos 6 meses.</p>

      {loading ? (
        <div className="text-sm text-muted py-8 text-center">Cargando…</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-white border border-line rounded-xl p-4">
              <div className="text-xs text-muted">Entradas (6 meses)</div>
              <div className="text-lg font-bold text-brand-600 mt-1">{fmtCLP(totalEntradas)}</div>
            </div>
            <div className="bg-white border border-line rounded-xl p-4">
              <div className="text-xs text-muted">Salidas (6 meses)</div>
              <div className="text-lg font-bold text-red-600 mt-1">{fmtCLP(totalSalidas)}</div>
            </div>
            <div className="bg-white border border-line rounded-xl p-4">
              <div className="text-xs text-muted">Flujo neto</div>
              <div className={`text-lg font-bold mt-1 ${netoTotal >= 0 ? "text-brand-600" : "text-red-600"}`}>
                {fmtCLP(netoTotal)}
              </div>
            </div>
          </div>

          <div className="bg-white border border-line rounded-xl p-5">
            <div className="text-sm font-semibold mb-3">Entradas vs. salidas por mes</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={rows}>
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={50} />
                <Tooltip formatter={(v: number) => fmtCLP(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="entradas" name="Entradas" fill="#059669" radius={[4, 4, 0, 0]} />
                <Bar dataKey="salidas" name="Salidas" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
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
