"use client";
import React, { useState } from "react";
import {
  BarChart3,
  Package,
  Receipt,
  TrendingUp,
  CheckCircle2,
  ChevronDown,
  PlusCircle,
  Wallet,
  LineChart,
} from "lucide-react";

const FEATURES = [
  {
    icon: Receipt,
    title: "Registro rápido de ventas",
    body: "Agrega varios productos a una venta en segundos, con el botón + Nueva venta siempre a mano.",
  },
  {
    icon: Package,
    title: "Inventario en tiempo real",
    body: "El stock se descuenta solo con cada venta. Alertas cuando un producto está por agotarse.",
  },
  {
    icon: TrendingUp,
    title: "Ganancia real, no solo ventas",
    body: "Separamos ventas, costo de productos y gastos para mostrarte lo que de verdad te queda.",
  },
  {
    icon: BarChart3,
    title: "Reportes que se entienden",
    body: "Qué productos son más rentables, cómo evolucionan tus gastos, y cómo va tu mes vs. el anterior.",
  },
];

const HOW_IT_WORKS = [
  {
    icon: PlusCircle,
    title: "Registra tu venta",
    body: "En pocos clics, agregando uno o varios productos a la vez. Sin formularios eternos.",
  },
  {
    icon: Wallet,
    title: "Controla tus gastos",
    body: "Arriendo, servicios, sueldos, proveedores — todo clasificado por categoría.",
  },
  {
    icon: LineChart,
    title: "Mira tu ganancia real",
    body: "NegocioFlow resta automáticamente el costo de tus productos y tus gastos de las ventas.",
  },
];

const REPORT_TYPES = [
  "Ventas por día y por mes",
  "Ganancia por mes",
  "Gastos por categoría",
  "Productos más vendidos y más rentables",
  "Métodos de pago",
  "Margen de ganancia",
];

const FAQS = [
  {
    q: "¿Necesito saber de contabilidad para usar NegocioFlow?",
    a: "No. El dashboard está pensado para que cualquier dueño de negocio entienda de un vistazo cuánto vendió, cuánto gastó y cuánto le quedó, sin términos contables complicados.",
  },
  {
    q: "¿Qué pasa si tengo más de 50 ventas o 20 productos al mes?",
    a: "El plan Free tiene esos límites. Si los superas, puedes pasar a Pro en cualquier momento para ventas y productos ilimitados, sin perder tu historial.",
  },
  {
    q: "¿Mis datos están seguros?",
    a: "Cada negocio solo puede ver sus propios datos: usamos seguridad a nivel de base de datos (RLS) para que eso se cumpla siempre, incluso si alguien intentara acceder directamente a la API.",
  },
  {
    q: "¿Puedo probar antes de pagar?",
    a: "Sí. El plan Free no tiene costo ni requiere tarjeta, y puedes cargar datos de demostración para explorar la app antes de registrar tus propios datos.",
  },
  {
    q: "¿Cómo cancelo el plan Pro?",
    a: "El plan Pro es sin contrato: cuando decidas no renovar, tu negocio vuelve automáticamente al plan Free al vencer el período pagado.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "",
    features: ["50 ventas al mes", "20 productos", "Dashboard básico", "Inventario básico", "Reportes básicos"],
  },
  {
    name: "Pro",
    price: "$6.990",
    period: "/mes",
    note: "o $59.990 / año (ahorra 28%)",
    highlight: true,
    features: [
      "Ventas y productos ilimitados",
      "Inventario completo",
      "Reportes avanzados",
      "Flujo de caja",
      "Clientes y proveedores",
      "Exportación CSV / PDF",
      "Alertas inteligentes",
    ],
  },
  {
    name: "Plus",
    price: "$14.990",
    period: "/mes",
    note: "o $149.990 / año (ahorra 16%)",
    features: [
      "Todo lo del plan Pro",
      "Hasta 5 negocios en tu cuenta",
      "Se aplica automáticamente a todos ellos",
    ],
  },
];

export default function Landing({
  onGetStarted,
  onLogin,
}: {
  onGetStarted: () => void;
  onLogin: () => void;
}) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="min-h-screen bg-white text-ink">
      {/* nav */}
      <div className="max-w-5xl mx-auto flex items-center justify-between px-6 py-5">
        <div className="font-bold text-lg">NegocioFlow</div>
        <button onClick={onLogin} className="text-sm text-muted border border-line rounded-full px-4 py-1.5">
          Iniciar sesión
        </button>
      </div>

      {/* hero */}
      <div className="max-w-3xl mx-auto text-center px-6 pt-10 pb-6">
        <h1 className="text-4xl sm:text-5xl font-bold leading-tight">
          Entiende cuánto <span className="text-brand-500">realmente</span> gana tu negocio.
        </h1>
        <p className="text-muted text-lg mt-5 max-w-xl mx-auto">
          Registra tus ventas, controla tus gastos y descubre dónde está realmente tu dinero.
        </p>
        <button
          onClick={onGetStarted}
          className="mt-8 bg-brand-500 hover:bg-brand-600 transition text-white font-semibold px-7 py-3 rounded-xl text-base"
        >
          Comenzar gratis
        </button>
        <div className="text-xs text-muted mt-3">Sin tarjeta de crédito. Empieza en 2 minutos.</div>
      </div>

      {/* dashboard preview mockup */}
      <div className="max-w-3xl mx-auto px-6 mt-8">
        <div className="bg-surface border border-line rounded-2xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Ventas del mes", value: "$2.450.000", color: "text-ink" },
            { label: "Costos", value: "$1.200.000", color: "text-muted" },
            { label: "Gastos", value: "$350.000", color: "text-muted" },
            { label: "Ganancia neta", value: "$900.000", color: "text-brand-600" },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-line rounded-xl p-4">
              <div className="text-xs text-muted">{s.label}</div>
              <div className={`text-lg font-bold mt-1 ${s.color}`}>{s.value}</div>
            </div>
          ))}
        </div>
        <div className="text-center text-xs text-muted mt-2">
          Ejemplo ilustrativo — los resultados reales dependen de tu negocio.
        </div>
      </div>

      {/* cómo funciona */}
      <div className="max-w-5xl mx-auto px-6 py-16">
        <h2 className="text-2xl font-bold text-center mb-10">Cómo funciona</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {HOW_IT_WORKS.map((step, i) => {
            const Icon = step.icon;
            return (
              <div key={step.title} className="text-center">
                <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mx-auto">
                  <Icon size={22} className="text-brand-600" />
                </div>
                <div className="text-xs text-muted font-medium mt-3">Paso {i + 1}</div>
                <div className="font-semibold mt-1">{step.title}</div>
                <div className="text-sm text-muted mt-2 leading-relaxed">{step.body}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* features */}
      <div className="max-w-5xl mx-auto px-6 py-6 grid sm:grid-cols-2 gap-5">
        {FEATURES.map((f) => {
          const Icon = f.icon;
          return (
            <div key={f.title} className="border border-line rounded-2xl p-6">
              <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                <Icon size={20} className="text-brand-600" />
              </div>
              <div className="font-semibold mt-4">{f.title}</div>
              <div className="text-sm text-muted mt-2 leading-relaxed">{f.body}</div>
            </div>
          );
        })}
      </div>

      {/* inventario */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-2xl font-bold mb-3">Nunca más te quedes sin saber qué se está agotando</h2>
            <p className="text-sm text-muted leading-relaxed">
              Cada venta descuenta el stock automáticamente. NegocioFlow te avisa qué productos están por acabarse
              antes de que sea tarde, y qué productos ya no tienes disponibles para vender.
            </p>
          </div>
          <div className="bg-surface border border-line rounded-2xl p-5 space-y-3">
            {[
              { name: "Coca-Cola 1.5L", badge: "🟢 Normal", color: "text-brand-700 bg-brand-50" },
              { name: "Pan hallulla", badge: "🟠 Stock bajo", color: "text-amber-700 bg-amber-50" },
              { name: "Detergente 1kg", badge: "🔴 Agotado", color: "text-red-700 bg-red-50" },
            ].map((p) => (
              <div key={p.name} className="flex items-center justify-between bg-white border border-line rounded-lg px-4 py-3">
                <span className="text-sm font-medium">{p.name}</span>
                <span className={`text-xs px-2 py-1 rounded-full ${p.color}`}>{p.badge}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* reportes */}
      <div className="max-w-4xl mx-auto px-6 py-16">
        <div className="grid sm:grid-cols-2 gap-8 items-center">
          <div className="bg-surface border border-line rounded-2xl p-5 order-2 sm:order-1">
            <ul className="space-y-2">
              {REPORT_TYPES.map((r) => (
                <li key={r} className="flex items-center gap-2 text-sm bg-white border border-line rounded-lg px-4 py-2.5">
                  <BarChart3 size={14} className="text-brand-600 flex-shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>
          <div className="order-1 sm:order-2">
            <h2 className="text-2xl font-bold mb-3">Reportes que de verdad te ayudan a decidir</h2>
            <p className="text-sm text-muted leading-relaxed">
              No se trata solo de ver qué vendiste más, sino qué te dejó más plata. Compara tu negocio mes a mes y
              filtra por el período que necesites: hoy, esta semana, este mes o el rango que quieras.
            </p>
          </div>
        </div>
      </div>

      {/* pricing */}
      <div className="max-w-5xl mx-auto px-6 pb-16">
        <h2 className="text-2xl font-bold text-center mb-8">Planes</h2>
        <div className="grid sm:grid-cols-3 gap-6">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`rounded-2xl p-7 border ${
                p.highlight ? "border-brand-500 bg-brand-50" : "border-line bg-white"
              }`}
            >
              <div className="font-semibold text-lg">{p.name}</div>
              <div className="mt-2">
                <span className="text-3xl font-bold">{p.price}</span>
                <span className="text-muted text-sm"> CLP{p.period}</span>
              </div>
              {p.note && <div className="text-xs text-muted mt-1">{p.note}</div>}
              <ul className="mt-5 space-y-2">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-muted">
                    <CheckCircle2 size={16} className="text-brand-500 mt-0.5 flex-shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                onClick={onGetStarted}
                className={`mt-6 w-full py-2.5 rounded-lg font-semibold text-sm ${
                  p.highlight ? "bg-brand-500 text-white" : "border border-line text-ink"
                }`}
              >
                Comenzar gratis
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* FAQ */}
      <div className="max-w-3xl mx-auto px-6 pb-20">
        <h2 className="text-2xl font-bold text-center mb-8">Preguntas frecuentes</h2>
        <div className="space-y-2">
          {FAQS.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q} className="border border-line rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="w-full flex items-center justify-between gap-3 px-5 py-3.5 text-left"
                >
                  <span className="text-sm font-medium">{f.q}</span>
                  <ChevronDown
                    size={16}
                    className={`text-muted flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && <div className="px-5 pb-4 text-sm text-muted leading-relaxed">{f.a}</div>}
              </div>
            );
          })}
        </div>
      </div>

      <div className="text-center text-xs text-muted py-8 border-t border-line space-y-2">
        <div>NegocioFlow — Hecho para pequeños negocios en Chile.</div>
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <a href="/terminos" className="hover:text-ink">
            Términos de servicio
          </a>
          <span>·</span>
          <a href="/privacidad" className="hover:text-ink">
            Política de privacidad
          </a>
          <span>·</span>
          <a href="mailto:carlosbaumert63@gmail.com" className="hover:text-ink">
            carlosbaumert63@gmail.com
          </a>
        </div>
        <div className="text-[11px] text-muted/80">[COMPLETAR: nombre completo y RUT del responsable] · Temuco, Chile</div>
      </div>
    </div>
  );
}
