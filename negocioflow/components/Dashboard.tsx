"use client";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Lock,
  Sparkles,
  Loader2,
  X,
  Target,
  Pencil,
  Check,
  Share2,
  RefreshCw,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Business } from "../lib/types";
import { usePlan } from "./PlanContext";
import { seedDemoData, clearDemoData, hasDemoData } from "../lib/demoData";
import { FREE_LIMITS, friendlyDbError } from "../lib/plan";
import { localISODate, formatDateCL } from "../lib/dates";
import { parseCLP } from "../lib/numbers";

// Lo que devuelve la función dashboard_summary de la base de datos. Todo se
// suma en SQL, así que no hay tope de filas ni diferencias de zona horaria.
interface Summary {
  today_sales: number;
  today_gross_profit: number;
  today_count: number;
  today_expenses: number | null;
  month_sales: number;
  month_cost: number;
  month_count: number;
  month_count_real: number;
  month_expenses: number | null;
  month_to_date_sales: number;
  prev_month_sales: number;
  prev_month_to_date_sales: number;
  low_stock: number;
  out_of_stock: number;
  products_count_real: number;
  pending: { receivable: number; customers: number; sales: number };
  top_product: { name: string; profit: number } | null;
  daily: { date: string; sales: number; count: number }[];
}

const WEEKDAYS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

function shortDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WEEKDAYS[dt.getDay()]} ${d}`;
}

function compactCLP(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1).replace(".", ",")}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${Math.round(n)}`;
}

export default function Dashboard({
  business,
  onBusinessUpdated,
}: {
  business: Business;
  onBusinessUpdated?: (b: Business) => void;
}) {
  const { isPro, isOwner, goToPlan } = usePlan();
  const [s, setS] = useState<Summary | null>(null);
  const [loadError, setLoadError] = useState("");
  const [hasAnyData, setHasAnyData] = useState(true);
  const [demoActive, setDemoActive] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);
  const [demoError, setDemoError] = useState("");
  const [goal, setGoal] = useState<number | null>(business.monthly_sales_goal ? Number(business.monthly_sales_goal) : null);
  const [editingGoal, setEditingGoal] = useState(false);
  const [goalInput, setGoalInput] = useState(String(business.monthly_sales_goal || ""));
  const [savingGoal, setSavingGoal] = useState(false);
  const [goalError, setGoalError] = useState("");

  const load = useCallback(async () => {
    setLoadError("");
    const { data, error } = await supabase.rpc("dashboard_summary", {
      p_business_id: business.id,
      p_today: localISODate(),
    });
    if (error) {
      setLoadError(friendlyDbError(error.message));
      return;
    }
    const raw = data as any;
    // Postgres devuelve numeric como número o string según el caso: normalizamos.
    const num = (v: any) => (v === null || v === undefined ? 0 : Number(v));
    setS({
      ...raw,
      today_sales: num(raw.today_sales),
      today_gross_profit: num(raw.today_gross_profit),
      today_count: num(raw.today_count),
      today_expenses: raw.today_expenses === null ? null : num(raw.today_expenses),
      month_sales: num(raw.month_sales),
      month_cost: num(raw.month_cost),
      month_count: num(raw.month_count),
      month_count_real: num(raw.month_count_real),
      month_expenses: raw.month_expenses === null ? null : num(raw.month_expenses),
      month_to_date_sales: num(raw.month_to_date_sales),
      prev_month_sales: num(raw.prev_month_sales),
      prev_month_to_date_sales: num(raw.prev_month_to_date_sales),
      low_stock: num(raw.low_stock),
      out_of_stock: num(raw.out_of_stock),
      products_count_real: num(raw.products_count_real),
      pending: {
        receivable: num(raw.pending?.receivable),
        customers: num(raw.pending?.customers),
        sales: num(raw.pending?.sales),
      },
      top_product: raw.top_product ? { name: raw.top_product.name, profit: num(raw.top_product.profit) } : null,
      daily: (raw.daily || []).map((d: any) => ({ date: d.date, sales: num(d.sales), count: num(d.count) })),
    });
  }, [business.id]);

  async function checkDemoState() {
    const [{ count: realCount }, demo] = await Promise.all([
      supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .eq("business_id", business.id)
        .eq("is_demo", false),
      hasDemoData(business.id),
    ]);
    setHasAnyData((realCount || 0) > 0);
    setDemoActive(demo);
  }

  useEffect(() => {
    load();
    checkDemoState();
    // Al volver a la pestaña (p. ej. después de vender en otro dispositivo) se actualiza.
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  async function saveGoal() {
    setGoalError("");
    const raw = String(goalInput).trim();
    const value = raw === "" ? null : parseCLP(raw);
    if (raw !== "" && (value === null || value < 0)) {
      return setGoalError("Escribe la meta como un monto, por ejemplo 3.000.000.");
    }
    const newGoal = value && value > 0 ? value : null;
    setSavingGoal(true);
    const { error } = await supabase.from("businesses").update({ monthly_sales_goal: newGoal }).eq("id", business.id);
    setSavingGoal(false);
    if (error) return setGoalError(friendlyDbError(error.message));
    setGoal(newGoal);
    setEditingGoal(false);
    onBusinessUpdated?.({ ...business, monthly_sales_goal: newGoal });
  }

  async function handleLoadDemo() {
    setDemoBusy(true);
    setDemoError("");
    const res = await seedDemoData(business.id);
    setDemoBusy(false);
    if (res.error) return setDemoError(friendlyDbError(res.error));
    await Promise.all([checkDemoState(), load()]);
  }

  async function handleClearDemo() {
    if (!confirm("¿Borrar todos los datos de demostración? Tus datos reales no se tocan.")) return;
    setDemoBusy(true);
    setDemoError("");
    const res = await clearDemoData(business.id);
    setDemoBusy(false);
    if (res.error) return setDemoError(friendlyDbError(res.error));
    await Promise.all([checkDemoState(), load()]);
  }

  const chartData = useMemo(
    () => (s?.daily || []).map((d) => ({ ...d, label: shortDay(d.date) })),
    [s]
  );

  if (loadError) {
    return (
      <div className="text-sm text-center py-10">
        <div className="text-red-600 mb-3">{loadError}</div>
        <button onClick={load} className="inline-flex items-center gap-1.5 text-ink underline">
          <RefreshCw size={14} /> Reintentar
        </button>
      </div>
    );
  }

  if (!s) {
    return <div className="text-sm text-muted py-10 text-center">Cargando…</div>;
  }

  const stockAlerts = (s.out_of_stock > 0 || s.low_stock > 0) && (
    <>
      {s.out_of_stock > 0 && <Alert text={`${s.out_of_stock} producto(s) están agotados.`} />}
      {s.low_stock > 0 && <Alert text={`${s.low_stock} producto(s) tienen stock bajo.`} />}
    </>
  );

  if (!isOwner) {
    return (
      <div>
        <h1 className="text-xl font-bold mb-1">Hola 👋</h1>
        <p className="text-sm text-muted mb-6">Así va {business.name} hoy.</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          <StatCard label="Ventas de hoy" value={fmtCLP(s.today_sales)} highlight />
          <StatCard label="N° de ventas" value={String(s.today_count)} />
        </div>
        {stockAlerts && <div className="space-y-2">{stockAlerts}</div>}
      </div>
    );
  }

  const monthExpenses = s.month_expenses || 0;
  const todayExpenses = s.today_expenses || 0;
  const monthProfit = s.month_sales - s.month_cost - monthExpenses;
  const margin = s.month_sales > 0 ? (monthProfit / s.month_sales) * 100 : 0;
  const todayProfit = s.today_gross_profit - todayExpenses;

  // Comparación justa: este mes hasta hoy vs. el mes anterior hasta el mismo día.
  const salesChange =
    s.prev_month_to_date_sales > 0
      ? ((s.month_to_date_sales - s.prev_month_to_date_sales) / s.prev_month_to_date_sales) * 100
      : null;

  const grossMarginRatio = s.month_sales > 0 ? (s.month_sales - s.month_cost) / s.month_sales : 0;
  const breakEvenSales = grossMarginRatio > 0 ? monthExpenses / grossMarginRatio : 0;
  const hasChartData = chartData.some((d) => d.sales > 0);

  function shareToday() {
    const lines = [
      `📊 *${business.name}* — resumen de hoy (${formatDateCL(localISODate())})`,
      `Ventas: ${fmtCLP(s!.today_sales)} (${s!.today_count} ${s!.today_count === 1 ? "venta" : "ventas"})`,
      `Gastos: ${fmtCLP(todayExpenses)}`,
      `Ganancia estimada: ${fmtCLP(todayProfit)}`,
      ``,
      `Mes a la fecha: ${fmtCLP(s!.month_to_date_sales)} en ventas`,
    ];
    if (goal) lines.push(`Meta del mes: ${Math.min(100, Math.round((s!.month_sales / goal) * 100))}% cumplida`);
    if (s!.pending.receivable > 0) lines.push(`Por cobrar (fiado): ${fmtCLP(s!.pending.receivable)}`);
    lines.push(``, `Enviado desde NegocioFlow`);
    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div>
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold mb-1">Hola 👋</h1>
          <p className="text-sm text-muted">Así va {business.name} hoy.</p>
        </div>
        <button
          onClick={shareToday}
          className="flex items-center gap-1.5 text-xs font-medium border border-line bg-white px-3 py-2 rounded-lg hover:bg-surface flex-shrink-0"
          title="Enviar el resumen del día por WhatsApp"
        >
          <Share2 size={14} /> Compartir resumen
        </button>
      </div>

      {demoActive && (
        <div className="flex items-center justify-between gap-3 text-sm px-3 py-2.5 rounded-lg border border-violet-100 bg-violet-50 text-violet-700 mb-6">
          <div className="flex items-center gap-2">
            <Sparkles size={15} className="flex-shrink-0" />
            Estás viendo datos de <strong>DEMOSTRACIÓN</strong>, no son tus datos reales.
          </div>
          <button
            onClick={handleClearDemo}
            disabled={demoBusy}
            className="flex items-center gap-1 text-xs font-medium underline flex-shrink-0 disabled:opacity-60"
          >
            {demoBusy ? <Loader2 size={12} className="animate-spin" /> : <X size={12} />}
            Borrar demo
          </button>
        </div>
      )}

      {!hasAnyData && !demoActive && (
        <div className="flex items-center justify-between gap-3 text-sm px-3 py-2.5 rounded-lg border border-line bg-white mb-6 flex-wrap">
          <div className="flex items-center gap-2 text-muted">
            <Sparkles size={15} className="flex-shrink-0 text-brand-600" />
            Aún no tienes datos. Registra tu primera venta o explora con datos de ejemplo.
          </div>
          <button
            onClick={handleLoadDemo}
            disabled={demoBusy}
            className="flex items-center gap-1.5 text-xs font-medium bg-ink text-white px-3 py-1.5 rounded-lg disabled:opacity-60"
          >
            {demoBusy && <Loader2 size={12} className="animate-spin" />}
            Cargar datos de demostración
          </button>
        </div>
      )}
      {demoError && <div className="text-sm text-red-600 mb-4">{demoError}</div>}

      {!isPro &&
        (s.month_count_real >= FREE_LIMITS.sales * 0.8 || s.products_count_real >= FREE_LIMITS.products * 0.8) && (
          <button
            onClick={goToPlan}
            className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg border border-amber-100 bg-amber-50 text-amber-700 mb-6 w-full text-left"
          >
            <AlertTriangle size={14} className="flex-shrink-0" />
            {s.month_count_real >= FREE_LIMITS.sales
              ? `Llegaste al límite de ${FREE_LIMITS.sales} ventas de este mes en el plan Free.`
              : s.month_count_real >= FREE_LIMITS.sales * 0.8
              ? `Vas en ${s.month_count_real} de ${FREE_LIMITS.sales} ventas este mes (plan Free).`
              : s.products_count_real >= FREE_LIMITS.products
              ? `Llegaste al límite de ${FREE_LIMITS.products} productos en el plan Free.`
              : `Vas en ${s.products_count_real} de ${FREE_LIMITS.products} productos (plan Free).`}{" "}
            Mejora a Pro para no tener límites.
          </button>
        )}

      {/* alertas */}
      {isPro ? (
        (stockAlerts || (salesChange !== null && salesChange < -10) || s.pending.receivable > 0 || s.top_product) && (
          <div className="space-y-2 mb-6">
            {stockAlerts}
            {salesChange !== null && salesChange < -10 && (
              <Alert
                text={`Tus ventas van ${Math.abs(salesChange).toFixed(0)}% más bajas que el mes anterior a esta misma fecha.`}
              />
            )}
            {s.pending.receivable > 0 && (
              <Alert
                text={
                  s.pending.customers > 0
                    ? `Te deben ${fmtCLP(s.pending.receivable)} entre ${s.pending.customers} cliente(s). Revisa la sección Clientes.`
                    : `Tienes ${fmtCLP(s.pending.receivable)} en ventas al fiado por cobrar.`
                }
              />
            )}
            {s.top_product && <Alert text={`${s.top_product.name} es tu producto más rentable este mes.`} positive />}
          </div>
        )
      ) : (
        stockAlerts && (
          <button
            onClick={goToPlan}
            className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg border border-amber-100 bg-amber-50 text-amber-700 mb-6 w-full text-left"
          >
            <Lock size={14} className="flex-shrink-0" />
            Tienes productos con stock bajo o agotado. Las alertas detalladas son una función Pro.
          </button>
        )
      )}

      {/* hoy */}
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Hoy</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
        <StatCard label="Ventas" value={fmtCLP(s.today_sales)} />
        <StatCard label="Gastos" value={fmtCLP(todayExpenses)} />
        <StatCard label="Ganancia estimada" value={fmtCLP(todayProfit)} highlight />
        <StatCard label="N° de ventas" value={String(s.today_count)} />
      </div>

      {/* últimos 14 días */}
      <div className="bg-white border border-line rounded-xl p-4 mb-8">
        <div className="flex items-baseline justify-between gap-2 mb-3">
          <div className="text-sm font-semibold">Ventas de los últimos 14 días</div>
          <div className="text-xs text-muted">
            Total {fmtCLP(chartData.reduce((acc, d) => acc + d.sales, 0))}
          </div>
        </div>
        {hasChartData ? (
          <div className="h-48" role="img" aria-label="Gráfico de barras con las ventas diarias de los últimos 14 días">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barCategoryGap={2}>
                <CartesianGrid vertical={false} stroke="#E2E8F0" strokeDasharray="0" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: "#64748B" }}
                  tickLine={false}
                  axisLine={{ stroke: "#E2E8F0" }}
                  interval="preserveStartEnd"
                  minTickGap={8}
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
                  formatter={(value: number) => [fmtCLP(value), "Ventas"]}
                  labelFormatter={(_label: string, payload: any[]) => {
                    const p = payload?.[0]?.payload;
                    return p ? `${formatDateCL(p.date)} · ${p.count} ${p.count === 1 ? "venta" : "ventas"}` : "";
                  }}
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}
                />
                <Bar dataKey="sales" fill="#059669" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="h-24 flex items-center justify-center text-sm text-muted">
            Cuando registres ventas, aquí verás cómo te va día a día.
          </div>
        )}
      </div>

      {/* este mes */}
      <div className="text-xs font-semibold text-muted uppercase tracking-wide mb-2">Este mes</div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-3">
        <StatCard label="Ventas" value={fmtCLP(s.month_sales)} />
        <StatCard label="Costos" value={fmtCLP(s.month_cost)} />
        <StatCard label="Gastos" value={fmtCLP(monthExpenses)} />
        <StatCard label="Ganancia neta" value={fmtCLP(monthProfit)} highlight />
      </div>
      <div className="flex items-center gap-4 text-sm text-muted flex-wrap mb-6">
        <span>
          Margen: <strong className="text-ink">{margin.toFixed(1).replace(".", ",")}%</strong>
        </span>
        {salesChange !== null && (
          <span
            className={`flex items-center gap-1 ${salesChange >= 0 ? "text-brand-600" : "text-red-600"}`}
            title="Comparado con el mes anterior hasta el mismo día del mes"
          >
            {salesChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {salesChange >= 0 ? "+" : "−"}
            {Math.abs(salesChange).toFixed(0)}% vs. mes anterior a la misma fecha
          </span>
        )}
      </div>

      {/* meta de venta mensual */}
      <div className="bg-white border border-line rounded-xl p-4 mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Target size={13} /> Meta de venta este mes
          </div>
          {!editingGoal && (
            <button
              onClick={() => {
                setGoalInput(String(goal || ""));
                setEditingGoal(true);
              }}
              className="text-muted hover:text-ink"
              aria-label="Editar meta de venta"
            >
              <Pencil size={13} />
            </button>
          )}
        </div>
        {editingGoal ? (
          <>
            <div className="flex items-center gap-2 mt-2">
              <input
                inputMode="numeric"
                autoFocus
                value={goalInput}
                onChange={(e) => setGoalInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && saveGoal()}
                placeholder="Ej. 3.000.000"
                aria-label="Meta de venta mensual"
                className="flex-1 px-3 py-2 border border-line rounded-lg text-sm"
              />
              <button
                onClick={saveGoal}
                disabled={savingGoal}
                className="bg-brand-500 text-white px-3 py-2 rounded-lg disabled:opacity-60"
                aria-label="Guardar meta"
              >
                {savingGoal ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              </button>
              <button onClick={() => setEditingGoal(false)} className="text-muted px-1" aria-label="Cancelar">
                <X size={16} />
              </button>
            </div>
            {goalError && <div className="text-xs text-red-600 mt-1.5">{goalError}</div>}
            <div className="text-[11px] text-muted mt-1.5">Déjala vacía para quitar la meta.</div>
          </>
        ) : goal ? (
          <>
            <div className="text-base mt-1">
              <strong className="text-ink">{fmtCLP(s.month_sales)}</strong>
              <span className="text-muted"> de {fmtCLP(goal)}</span>
            </div>
            <div
              className="h-2 bg-surface rounded-full overflow-hidden mt-2"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.min(100, Math.round((s.month_sales / goal) * 100))}
            >
              <div
                className="h-full bg-brand-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (s.month_sales / goal) * 100)}%` }}
              />
            </div>
            <div className="text-xs text-muted mt-1.5">
              {s.month_sales >= goal
                ? "¡Meta cumplida este mes! 🎉"
                : `Vas en ${((s.month_sales / goal) * 100).toFixed(0)}% — faltan ${fmtCLP(goal - s.month_sales)}.`}
            </div>
          </>
        ) : (
          <div className="text-sm text-muted mt-1">
            No has definido una meta.{" "}
            <button onClick={() => setEditingGoal(true)} className="underline text-ink">
              Define una
            </button>{" "}
            para ver tu avance acá.
          </div>
        )}
      </div>

      {isPro ? (
        breakEvenSales > 0 && (
          <div className="bg-white border border-line rounded-xl p-4">
            <div className="text-xs text-muted mb-1">Punto de equilibrio este mes</div>
            <div className="text-base">
              Necesitas vender <strong className="text-ink">{fmtCLP(breakEvenSales)}</strong> para cubrir tus costos y
              gastos.
            </div>
            <div className="text-xs text-muted mt-1">
              {s.month_sales >= breakEvenSales
                ? "Ya superaste ese punto este mes 🎉"
                : `Te faltan ${fmtCLP(breakEvenSales - s.month_sales)} en ventas para llegar.`}
            </div>
          </div>
        )
      ) : (
        <button
          onClick={goToPlan}
          className="flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg border border-line bg-white text-muted w-full text-left"
        >
          <Lock size={14} className="flex-shrink-0" />
          El punto de equilibrio mensual es una función Pro.
        </button>
      )}
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="bg-white border border-line rounded-xl p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`text-lg font-bold mt-1 ${highlight ? "text-brand-600" : "text-ink"}`}>{value}</div>
    </div>
  );
}

function Alert({ text, positive }: { text: string; positive?: boolean }) {
  return (
    <div
      className={`flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg border ${
        positive ? "bg-brand-50 border-brand-100 text-brand-700" : "bg-amber-50 border-amber-100 text-amber-700"
      }`}
    >
      {!positive && <AlertTriangle size={15} className="flex-shrink-0" />}
      {text}
    </div>
  );
}
