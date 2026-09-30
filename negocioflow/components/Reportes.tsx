"use client";
import React, { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { Lock, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Business } from "../lib/types";
import { exportSalesCSV, exportExpensesCSV, exportProductsCSV, exportMonthlyPDF } from "../lib/export";
import { usePlan } from "./PlanContext";
import UpgradePanel from "./UpgradePanel";
import OwnerGate from "./OwnerGate";

const RANGES = [
  { key: "7d", label: "Últimos 7 días", days: 7 },
  { key: "30d", label: "Este mes", days: 30 },
  { key: "90d", label: "Últimos 3 meses", days: 90 },
];

const COLORS = ["#059669", "#F59E0B", "#3B82F6", "#EF4444", "#8B5CF6", "#EC4899"];

function ReportesInner({ business }: { business: Business }) {
  const { isPro } = usePlan();
  const [range, setRange] = useState("30d");
  const [exporting, setExporting] = useState<string | null>(null);

  async function runExport(key: string, fn: () => Promise<void>) {
    setExporting(key);
    try {
      await fn();
    } finally {
      setExporting(null);
    }
  }
  const [loading, setLoading] = useState(true);
  const [salesByDay, setSalesByDay] = useState<{ date: string; total: number }[]>([]);
  const [expensesByCategory, setExpensesByCategory] = useState<{ name: string; value: number }[]>([]);
  const [topProducts, setTopProducts] = useState<{ name: string; sales: number; profit: number }[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<{ name: string; value: number }[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      const days = RANGES.find((r) => r.key === range)?.days || 30;
      const since = new Date();
      since.setDate(since.getDate() - days);
      const sinceStr = since.toISOString().slice(0, 10);

      const [salesRes, expensesRes, itemsRes] = await Promise.all([
        supabase.from("sales").select("sale_date, total, payment_method").eq("business_id", business.id).gte("sale_date", sinceStr),
        supabase.from("expenses").select("category, amount").eq("business_id", business.id).gte("expense_date", sinceStr),
        supabase
          .from("sale_items")
          .select("product_name, quantity, unit_price, unit_cost, sales!inner(business_id, sale_date)")
          .eq("sales.business_id", business.id)
          .gte("sales.sale_date", sinceStr),
      ]);

      if (!active) return;

      const byDay = new Map<string, number>();
      (salesRes.data || []).forEach((s: any) => {
        byDay.set(s.sale_date, (byDay.get(s.sale_date) || 0) + Number(s.total));
      });
      setSalesByDay(
        Array.from(byDay.entries())
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, total]) => ({ date: date.slice(5), total }))
      );

      const byCategory = new Map<string, number>();
      (expensesRes.data || []).forEach((e: any) => {
        byCategory.set(e.category, (byCategory.get(e.category) || 0) + Number(e.amount));
      });
      setExpensesByCategory(Array.from(byCategory.entries()).map(([name, value]) => ({ name, value })));

      const byProduct = new Map<string, { sales: number; profit: number }>();
      (itemsRes.data || []).forEach((i: any) => {
        const sales = Number(i.unit_price) * Number(i.quantity);
        const profit = (Number(i.unit_price) - Number(i.unit_cost)) * Number(i.quantity);
        const cur = byProduct.get(i.product_name) || { sales: 0, profit: 0 };
        byProduct.set(i.product_name, { sales: cur.sales + sales, profit: cur.profit + profit });
      });
      setTopProducts(
        Array.from(byProduct.entries())
          .map(([name, v]) => ({ name, ...v }))
          .sort((a, b) => b.profit - a.profit)
          .slice(0, 8)
      );

      const byMethod = new Map<string, number>();
      (salesRes.data || []).forEach((s: any) => {
        byMethod.set(s.payment_method, (byMethod.get(s.payment_method) || 0) + Number(s.total));
      });
      setPaymentMethods(Array.from(byMethod.entries()).map(([name, value]) => ({ name, value })));

      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [business.id, range]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-xl font-bold">Reportes</h1>
        <div className="flex gap-1.5">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                range === r.key ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-muted py-8 text-center">Cargando…</div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2">
          <Card title="Ventas por día">
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={salesByDay}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={40} />
                <Tooltip formatter={(v: number) => fmtCLP(v)} />
                <Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card title="Gastos por categoría">
            {expensesByCategory.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={expensesByCategory} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                    {expensesByCategory.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtCLP(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>

          <Card title="Productos más rentables">
            {topProducts.length === 0 ? (
              <EmptyChart />
            ) : (
              <div className="space-y-2">
                {topProducts.map((p) => (
                  <div key={p.name} className="flex justify-between text-sm">
                    <span className="truncate">{p.name}</span>
                    <span className="flex-shrink-0 ml-2">
                      <span className="text-muted">{fmtCLP(p.sales)}</span>{" "}
                      <span className="text-brand-600 font-medium">{fmtCLP(p.profit)}</span>
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card title="Métodos de pago">
            {paymentMethods.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={paymentMethods} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={(e) => e.name}>
                    {paymentMethods.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtCLP(v)} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      <div className="mt-6 bg-white border border-line rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          {!isPro && <Lock size={15} className="text-muted" />}
          <div className="text-sm font-semibold">Exportación</div>
        </div>
        {!isPro ? (
          <>
            <p className="text-xs text-muted mb-4">Exportar a CSV y PDF requiere el plan Pro.</p>
            <UpgradePanel />
          </>
        ) : (
          <div className="flex flex-wrap gap-2 mt-3">
            <ExportButton
              icon={FileSpreadsheet}
              label="Ventas CSV"
              loading={exporting === "sales"}
              onClick={() => runExport("sales", () => exportSalesCSV(business.id))}
            />
            <ExportButton
              icon={FileSpreadsheet}
              label="Gastos CSV"
              loading={exporting === "expenses"}
              onClick={() => runExport("expenses", () => exportExpensesCSV(business.id))}
            />
            <ExportButton
              icon={FileSpreadsheet}
              label="Productos CSV"
              loading={exporting === "products"}
              onClick={() => runExport("products", () => exportProductsCSV(business.id))}
            />
            <ExportButton
              icon={FileText}
              label="Reporte mensual PDF"
              loading={exporting === "pdf"}
              onClick={() => runExport("pdf", () => exportMonthlyPDF(business))}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ExportButton({
  icon: Icon,
  label,
  loading,
  onClick,
}: {
  icon: any;
  label: string;
  loading: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="flex items-center gap-1.5 text-xs font-medium border border-line rounded-lg px-3 py-2 hover:border-brand-400 disabled:opacity-60"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-line rounded-xl p-5">
      <div className="text-sm font-semibold mb-3">{title}</div>
      {children}
    </div>
  );
}

export default function Reportes({ business }: { business: Business }) {
  return (
    <OwnerGate title="Reportes">
      <ReportesInner business={business} />
    </OwnerGate>
  );
}

function EmptyChart() {
  return <div className="text-sm text-muted py-10 text-center">Sin datos en este período.</div>;
}
