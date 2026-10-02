"use client";
import React, { useEffect, useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Lock, FileSpreadsheet, FileText, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Business } from "../lib/types";
import { exportSalesCSV, exportExpensesCSV, exportProductsCSV, exportMonthlyPDF } from "../lib/export";
import { localISODate, daysAgo, monthRange, formatDateCL } from "../lib/dates";
import { friendlyDbError } from "../lib/plan";
import { usePlan } from "./PlanContext";
import UpgradePanel from "./UpgradePanel";
import OwnerGate from "./OwnerGate";

type RangeKey = "7d" | "month" | "prev" | "90d";

const RANGES: { key: RangeKey; label: string }[] = [
  { key: "7d", label: "Últimos 7 días" },
  { key: "month", label: "Este mes" },
  { key: "prev", label: "Mes anterior" },
  { key: "90d", label: "Últimos 90 días" },
];

function rangeDates(key: RangeKey): { since: string; until: string } {
  const today = localISODate();
  switch (key) {
    case "7d":
      return { since: daysAgo(6), until: today };
    case "month":
      return { since: monthRange(0).start, until: today };
    case "prev": {
      const m = monthRange(-1);
      return { since: m.start, until: m.end };
    }
    case "90d":
      return { since: daysAgo(89), until: today };
  }
}

interface Report {
  days: { date: string; total: number }[];
  expenses_by_category: { name: string; value: number }[];
  top_products: { name: string; sales: number; profit: number; qty: number }[];
  payment_methods: { name: string; value: number; count: number }[];
  totals: { sales: number; cost: number; count: number; avg_ticket: number };
  expenses_total: number;
}

function compactCLP(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

function ReportesInner({ business }: { business: Business }) {
  const { isPro } = usePlan();
  const [range, setRange] = useState<RangeKey>("month");
  const [exporting, setExporting] = useState<string | null>(null);
  const [exportError, setExportError] = useState("");
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  async function runExport(key: string, fn: () => Promise<void>) {
    setExporting(key);
    setExportError("");
    try {
      await fn();
    } catch (err: any) {
      setExportError(friendlyDbError(err?.message) || "No se pudo exportar.");
    } finally {
      setExporting(null);
    }
  }

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      const { since, until } = rangeDates(range);
      const { data, error: err } = await supabase.rpc("report_summary", {
        p_business_id: business.id,
        p_since: since,
        p_until: until,
      });
      if (!active) return;
      if (err) {
        setError(friendlyDbError(err.message));
        setLoading(false);
        return;
      }
      const r = data as any;
      const n = (v: any) => Number(v || 0);
      setReport({
        days: (r.days || []).map((d: any) => ({ date: d.date, total: n(d.total) })),
        expenses_by_category: (r.expenses_by_category || []).map((c: any) => ({ name: c.name, value: n(c.value) })),
        top_products: (r.top_products || []).map((p: any) => ({
          name: p.name,
          sales: n(p.sales),
          profit: n(p.profit),
          qty: n(p.qty),
        })),
        payment_methods: (r.payment_methods || []).map((m: any) => ({ name: m.name, value: n(m.value), count: n(m.count) })),
        totals: {
          sales: n(r.totals?.sales),
          cost: n(r.totals?.cost),
          count: n(r.totals?.count),
          avg_ticket: n(r.totals?.avg_ticket),
        },
        expenses_total: n(r.expenses_total),
      });
      setLoading(false);
    }
    load();
    return () => {
      active = false;
    };
  }, [business.id, range, reloadKey]);

  const chartDays = useMemo(
    () =>
      (report?.days || []).map((d) => ({
        ...d,
        label: formatDateCL(d.date).slice(0, 5),
      })),
    [report]
  );

  const netProfit = report ? report.totals.sales - report.totals.cost - report.expenses_total : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
        <h1 className="text-xl font-bold">Reportes</h1>
        <div className="flex gap-1.5 flex-wrap" role="group" aria-label="Período del reporte">
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              aria-pressed={range === r.key}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                range === r.key ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="text-sm text-center py-10">
          <div className="text-red-600 mb-3">{error}</div>
          <button onClick={() => setReloadKey((k) => k + 1)} className="inline-flex items-center gap-1.5 underline">
            <RefreshCw size={14} /> Reintentar
          </button>
        </div>
      ) : loading || !report ? (
        <div className="text-sm text-muted py-8 text-center">Cargando…</div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <Tile label="Ventas" value={fmtCLP(report.totals.sales)} />
            <Tile label="N° de ventas" value={String(report.totals.count)} />
            <Tile label="Ticket promedio" value={fmtCLP(report.totals.avg_ticket)} />
            <Tile label="Ganancia neta" value={fmtCLP(netProfit)} highlight={netProfit >= 0} negative={netProfit < 0} />
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <Card title="Ventas por día" className="sm:col-span-2">
              {report.totals.count === 0 ? (
                <EmptyChart />
              ) : (
                <div className="h-56" role="img" aria-label="Gráfico de barras de ventas por día del período">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartDays} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
                      <CartesianGrid vertical={false} stroke="#E2E8F0" />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#64748B" }}
                        tickLine={false}
                        axisLine={{ stroke: "#E2E8F0" }}
                        interval="preserveStartEnd"
                        minTickGap={12}
                      />
                      <YAxis
                        tickFormatter={compactCLP}
                        tick={{ fontSize: 10, fill: "#64748B" }}
                        tickLine={false}
                        axisLine={false}
                        width={44}
                      />
                      <Tooltip
                        cursor={{ fill: "#F1F5F9" }}
                        formatter={(v: number) => [fmtCLP(v), "Ventas"]}
                        labelFormatter={(_l: string, payload: any[]) =>
                          payload?.[0]?.payload ? formatDateCL(payload[0].payload.date) : ""
                        }
                        contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                      />
                      <Bar dataKey="total" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </Card>

            <Card title="Productos más rentables">
              {report.top_products.length === 0 ? (
                <EmptyChart />
              ) : (
                <div className="space-y-2.5">
                  <div className="flex justify-between text-[11px] text-muted uppercase tracking-wide">
                    <span>Producto</span>
                    <span>Vendido · Ganancia</span>
                  </div>
                  {report.top_products.map((p) => (
                    <div key={p.name} className="flex justify-between gap-2 text-sm">
                      <span className="truncate">
                        {p.name} <span className="text-xs text-muted">({Number(p.qty.toFixed(2))})</span>
                      </span>
                      <span className="flex-shrink-0">
                        <span className="text-muted">{fmtCLP(p.sales)}</span>{" "}
                        <span className={`font-medium ${p.profit >= 0 ? "text-brand-600" : "text-red-600"}`}>
                          {fmtCLP(p.profit)}
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card title="Métodos de pago">
              {report.payment_methods.length === 0 ? (
                <EmptyChart />
              ) : (
                <RankedBars
                  rows={report.payment_methods.map((m) => ({
                    name: m.name,
                    value: m.value,
                    detail: `${m.count} ${m.count === 1 ? "venta" : "ventas"}`,
                  }))}
                />
              )}
            </Card>

            <Card title="Gastos por categoría" className="sm:col-span-2">
              {report.expenses_by_category.length === 0 ? (
                <EmptyChart />
              ) : (
                <RankedBars rows={report.expenses_by_category.map((c) => ({ name: c.name, value: c.value }))} />
              )}
            </Card>
          </div>
        </>
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
          <>
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
            {exportError && <div className="text-xs text-red-600 mt-2">{exportError}</div>}
          </>
        )}
      </div>
    </div>
  );
}

// Barras horizontales ordenadas de mayor a menor: una sola serie, un solo
// color, con el valor escrito (no depende del color para leerse).
function RankedBars({ rows }: { rows: { name: string; value: number; detail?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1);
  const total = rows.reduce((s, r) => s + r.value, 0);
  return (
    <div className="space-y-2.5">
      {rows.map((r) => (
        <div key={r.name}>
          <div className="flex justify-between gap-2 text-sm mb-1">
            <span className="capitalize truncate">{r.name}</span>
            <span className="flex-shrink-0">
              <span className="font-medium">{fmtCLP(r.value)}</span>
              <span className="text-xs text-muted">
                {" "}
                · {total > 0 ? Math.round((r.value / total) * 100) : 0}%{r.detail ? ` · ${r.detail}` : ""}
              </span>
            </span>
          </div>
          <div className="h-2 bg-surface rounded-full overflow-hidden">
            <div className="h-full bg-brand-500 rounded-full" style={{ width: `${(r.value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Tile({ label, value, highlight, negative }: { label: string; value: string; highlight?: boolean; negative?: boolean }) {
  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-lg font-bold mt-1 ${negative ? "text-red-600" : highlight ? "text-brand-600" : "text-ink"}`}>
        {value}
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
      className="flex items-center gap-1.5 text-xs font-medium border border-line rounded-lg px-3 py-2 hover:border-brand-500 disabled:opacity-60"
    >
      {loading ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}

function Card({ title, children, className = "" }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white border border-line rounded-xl p-5 ${className}`}>
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
