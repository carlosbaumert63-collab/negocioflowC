"use client";
import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ScanBarcode, ShoppingCart, ArrowRight } from "lucide-react";
import { PROFILES, type ProfileId } from "../lib/businessProfiles";

// Rubros que van rotando en la frase "Hecha para tu …".
const ROTATING: ProfileId[] = ["almacen", "botilleria", "ferreteria", "verduleria", "panaderia", "peluqueria", "restaurante"];

// Ventas de ejemplo que "entran" en la vista previa del panel.
const DEMO_SALES = [
  { text: "2× Coca-Cola 1,5 L", amount: 3780, profit: 1380 },
  { text: "Pan amasado 1 kg", amount: 2400, profit: 1200 },
  { text: "Cerveza 6-pack", amount: 6990, profit: 2290 },
  { text: "Martillo carpintero", amount: 8990, profit: 3490 },
  { text: "Palta Hass 1 kg", amount: 4500, profit: 1700 },
  { text: "Detergente 3 L", amount: 5990, profit: 1990 },
];

const BASE = { sales: 2450000, costs: 1200000, expenses: 350000 };
const BARS = [42, 58, 35, 66, 51, 74, 60];

const clp = (n: number) => "$" + Math.round(n).toLocaleString("es-CL");

/** Número que sube suavemente hasta `value` cada vez que cambia. */
function CountUp({ value, className }: { value: number; className?: string }) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? value : 0);
  const from = useRef(reduce ? value : 0);

  useEffect(() => {
    if (reduce) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    const dur = a === 0 ? 1400 : 600;
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(a + (value - a) * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reduce]);

  return <span className={className}>{clp(shown)}</span>;
}

export default function HeroAnimated({ onGetStarted }: { onGetStarted: () => void }) {
  const reduce = useReducedMotion();
  const [rubro, setRubro] = useState(0);
  const [sold, setSold] = useState({ sales: 0, profit: 0, count: 0 });
  const [toast, setToast] = useState<(typeof DEMO_SALES)[number] & { key: number } | null>(null);

  // Rubro que cambia cada 2 s.
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setRubro((r) => (r + 1) % ROTATING.length), 2000);
    return () => clearInterval(id);
  }, [reduce]);

  // Una venta de ejemplo cada ~3,5 s: aparece el aviso y suben los números.
  useEffect(() => {
    if (reduce) return;
    let i = 0;
    const first = setTimeout(run, 2200);
    const id = setInterval(run, 3600);
    function run() {
      const s = DEMO_SALES[i % DEMO_SALES.length];
      i++;
      setToast({ ...s, key: i });
      setSold((prev) => ({ sales: prev.sales + s.amount, profit: prev.profit + s.profit, count: prev.count + 1 }));
    }
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [reduce]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  const p = PROFILES[ROTATING[rubro]];
  const sales = BASE.sales + sold.sales;
  const costs = BASE.costs + (sold.sales - sold.profit);
  const net = sales - costs - BASE.expenses;
  const lastBar = Math.min(96, BARS[BARS.length - 1] + sold.count * 3);

  const fadeUp = (delay: number) =>
    reduce
      ? {}
      : {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
        };

  return (
    <div className="relative overflow-hidden">
      {/* manchas de color que se mueven lento en el fondo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-0">
        <motion.div
          className="absolute top-16 -left-24 w-80 h-80 rounded-full bg-brand-200/50 blur-3xl"
          animate={reduce ? undefined : { x: [0, 60, 0], y: [0, 30, 0] }}
          transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.div
          className="absolute top-40 -right-24 w-96 h-96 rounded-full bg-amber-200/40 blur-3xl"
          animate={reduce ? undefined : { x: [0, -50, 0], y: [0, -40, 0] }}
          transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
        />
      </div>

      {/* hero */}
      <div className="relative max-w-3xl mx-auto text-center px-6 pt-10 pb-6">
        <motion.div
          {...fadeUp(0)}
          className="inline-flex items-center gap-2 text-sm bg-white border border-line rounded-full pl-2 pr-4 py-1.5 shadow-sm"
        >
          <span className="bg-brand-50 text-brand-700 text-xs font-semibold rounded-full px-2 py-0.5">Nuevo</span>
          <span className="text-muted">Hecha para tu</span>
          <span className="relative inline-flex h-5 min-w-[7.5rem] overflow-hidden text-left">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={p.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -20, opacity: 0 }}
                transition={{ duration: 0.35 }}
                className="font-semibold text-ink whitespace-nowrap"
              >
                {p.emoji} {p.label.toLowerCase()}
              </motion.span>
            </AnimatePresence>
          </span>
        </motion.div>

        <motion.h1 {...fadeUp(0.1)} className="text-4xl sm:text-5xl font-bold leading-tight mt-6">
          Entiende cuánto{" "}
          <span className="relative inline-block isolate text-brand-500">
            realmente
            <motion.span
              aria-hidden
              className="absolute left-0 right-0 -bottom-1 h-2 rounded-full bg-brand-200 -z-10 origin-left"
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: 0.7, ease: "easeOut" }}
            />
          </span>{" "}
          gana tu negocio.
        </motion.h1>

        <motion.p {...fadeUp(0.2)} className="text-muted text-lg mt-5 max-w-xl mx-auto">
          Registra tus ventas escaneando el código de barras, controla tus gastos y descubre dónde está realmente tu dinero.
        </motion.p>

        <motion.div {...fadeUp(0.3)} className="mt-8 flex flex-col items-center">
          <motion.button
            onClick={onGetStarted}
            whileHover={reduce ? undefined : { scale: 1.04 }}
            whileTap={reduce ? undefined : { scale: 0.97 }}
            className="relative group bg-brand-500 hover:bg-brand-600 transition-colors text-white font-semibold px-7 py-3 rounded-xl text-base inline-flex items-center gap-2 shadow-lg shadow-brand-500/25"
          >
            {!reduce && (
              <motion.span
                aria-hidden
                className="absolute inset-0 rounded-xl ring-2 ring-brand-400"
                animate={{ opacity: [0.7, 0], scale: [1, 1.18] }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
              />
            )}
            Comenzar gratis
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </motion.button>
          <div className="text-xs text-muted mt-3">Sin tarjeta de crédito. Empieza en 2 minutos.</div>
        </motion.div>
      </div>

      {/* vista previa del panel, "en vivo" */}
      <motion.div
        className="relative max-w-3xl mx-auto px-6 mt-8"
        initial={reduce ? false : { opacity: 0, y: 40, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <div className="relative bg-surface border border-line rounded-2xl p-5 sm:p-6 shadow-xl shadow-slate-900/5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <span className="relative flex h-2.5 w-2.5">
                {!reduce && <span className="absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-75 animate-ping" />}
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-brand-500" />
              </span>
              Este mes
              <span className="text-xs font-normal text-muted inline-flex items-center gap-1 ml-1">
                <ScanBarcode size={14} />
                {sold.count > 0 ? `${sold.count} venta${sold.count === 1 ? "" : "s"} nueva${sold.count === 1 ? "" : "s"}` : "Caja abierta"}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Ventas del mes", value: sales, color: "text-ink" },
              { label: "Costos", value: costs, color: "text-muted" },
              { label: "Gastos", value: BASE.expenses, color: "text-muted" },
              { label: "Ganancia neta", value: net, color: "text-brand-600" },
            ].map((s, i) => (
              <motion.div
                key={s.label}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 + i * 0.1 }}
                className="bg-white border border-line rounded-xl p-3 sm:p-4"
              >
                <div className="text-xs text-muted">{s.label}</div>
                <CountUp value={s.value} className={`block text-base sm:text-lg font-bold mt-1 tabular-nums ${s.color}`} />
              </motion.div>
            ))}
          </div>

          {/* mini gráfico de la semana */}
          <div className="mt-4 bg-white border border-line rounded-xl p-4">
            <div className="text-xs text-muted mb-2">Ventas de la semana</div>
            <div className="flex items-end gap-2 h-20" aria-hidden>
              {BARS.map((h, i) => {
                const height = i === BARS.length - 1 ? lastBar : h;
                return (
                  <motion.div
                    key={i}
                    className={`flex-1 rounded-t-md ${i === BARS.length - 1 ? "bg-brand-500" : "bg-brand-200"}`}
                    initial={reduce ? false : { height: 0 }}
                    animate={{ height: `${height}%` }}
                    transition={{ duration: 0.7, delay: reduce ? 0 : 0.9 + i * 0.06, ease: "easeOut" }}
                  />
                );
              })}
            </div>
            <div className="flex gap-2 mt-1 text-[10px] text-muted">
              {["lun", "mar", "mié", "jue", "vie", "sáb", "hoy"].map((d) => (
                <div key={d} className="flex-1 text-center">{d}</div>
              ))}
            </div>
          </div>

          {/* aviso de venta que entra */}
          <AnimatePresence>
            {toast && (
              <motion.div
                key={toast.key}
                initial={{ opacity: 0, y: -16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ type: "spring", stiffness: 400, damping: 26 }}
                className="absolute -top-4 right-4 sm:right-6 flex items-center gap-2 bg-white border border-brand-100 shadow-lg rounded-xl px-3 py-2 text-sm"
                role="status"
              >
                <span className="w-7 h-7 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <ShoppingCart size={15} />
                </span>
                <span className="text-left leading-tight">
                  <span className="block font-semibold">Venta registrada</span>
                  <span className="block text-xs text-muted">
                    {toast.text} · <span className="text-brand-600 font-medium">+{clp(toast.amount)}</span>
                  </span>
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="text-center text-xs text-muted mt-2">
          Ejemplo ilustrativo — los resultados reales dependen de tu negocio.
        </div>
      </motion.div>
    </div>
  );
}
