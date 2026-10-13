"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  X,
  ArrowLeft,
  ArrowRight,
  Package,
  ScanBarcode,
  Receipt,
  LayoutDashboard,
  Wallet,
  Coins,
  Smartphone,
  Sparkles,
} from "lucide-react";
import type { Business } from "../lib/types";
import { getProfile, cap } from "../lib/businessProfiles";

export type TutorialTarget = "dashboard" | "ventas" | "productos" | "gastos" | "caja" | "reportes";

interface Step {
  icon: any;
  title: string;
  body: string;
  tips: string[];
  go?: { tab: TutorialTarget; label: string };
  ownerOnly?: boolean;
}

/** Tutorial paso a paso para aprender a usar la app. Se abre solo la primera vez y desde el botón "Tutorial". */
export default function Tutorial({
  business,
  isOwner,
  onClose,
  onGo,
}: {
  business: Business;
  isOwner: boolean;
  onClose: () => void;
  onGo: (tab: TutorialTarget) => void;
}) {
  const reduce = useReducedMotion();
  const profile = getProfile(business);
  const items = profile.itemPlural; // "productos" | "servicios" | "platos"
  const stock = business.has_inventory;

  const all: Step[] = [
    {
      icon: Sparkles,
      title: `Bienvenido a NegocioFlow`,
      body: "En un minuto te mostramos lo esencial: cargar lo que vendes, registrar ventas y ver cuánto ganas de verdad.",
      tips: ["Puedes cerrar este tutorial cuando quieras.", "Para volver a verlo, toca \"Tutorial\" en el menú."],
    },
    {
      icon: Package,
      title: `1. Carga tus ${items}`,
      body: `En "${profile.navLabel}" agregas lo que vendes con su precio${stock ? ", su costo y cuánto stock tienes" : " y su costo"}.`,
      tips: [
        "Pon el costo: así la app calcula tu ganancia real.",
        "Toca el ícono de código de barras para escanear el envase en vez de escribir el código.",
        stock ? "Define un stock mínimo y te avisamos cuando haya que reponer." : `Usa categorías para ordenar tus ${items}.`,
      ],
      go: { tab: "productos", label: `Ir a ${profile.navLabel}` },
    },
    {
      icon: Receipt,
      title: "2. Registra una venta",
      body: "Toca \"+ Nueva venta\", agrega lo que se lleva el cliente y aprieta Registrar venta.",
      tips: [
        "Escanea con la cámara del celular o con un lector USB: cada código suma el producto.",
        "Si escaneas un código que no existe, lo creas ahí mismo.",
        "En efectivo, escribe con cuánto paga y la app te muestra el vuelto.",
        "Al fiado: elige el cliente y marca \"Venta al fiado\".",
      ],
      go: { tab: "ventas", label: "Hacer una venta" },
    },
    {
      icon: LayoutDashboard,
      title: "3. Mira tu día en el Dashboard",
      body: "Ahí ves lo que vendiste hoy, cuánto ganaste, qué es lo más vendido" + (stock ? " y qué se está agotando." : "."),
      tips: ["Ponte una meta de ventas del mes y sigue tu avance.", "Comparte el resumen del día por WhatsApp."],
      go: { tab: "dashboard", label: "Ver el Dashboard" },
    },
    {
      icon: Wallet,
      title: "4. Anota tus gastos",
      body: "Arriendo, luz, sueldos, proveedores… Con tus gastos la app te muestra la ganancia que realmente te queda.",
      tips: ["Agrúpalos por categoría para ver en qué se te va la plata."],
      go: { tab: "gastos", label: "Ir a Gastos" },
      ownerOnly: true,
    },
    {
      icon: Coins,
      title: "5. Abre y cierra la caja",
      body: "En \"Caja diaria\" abres la caja con el efectivo inicial y al cerrar la app te dice cuánto debería haber.",
      tips: ["Si el conteo no cuadra, lo ves al tiro."],
      go: { tab: "caja", label: "Ir a Caja diaria" },
    },
    {
      icon: Smartphone,
      title: "Listo para vender",
      body: "Instala NegocioFlow en tu celular para abrirla como una app más.",
      tips: [
        "Android: menú del navegador → \"Instalar app\" o \"Agregar a pantalla de inicio\".",
        "iPhone: botón Compartir → \"Agregar a inicio\".",
        "¿Dudas? Toca \"Tutorial\" en el menú cuando quieras.",
      ],
    },
  ];
  const steps = all.filter((s) => isOwner || !s.ownerOnly);
  const [i, setI] = useState(0);
  const [dir, setDir] = useState(1);
  const step = steps[i];
  const last = i === steps.length - 1;
  const Icon = step.icon;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" && !last) next();
      if (e.key === "ArrowLeft" && i > 0) prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  function next() {
    setDir(1);
    setI((v) => Math.min(steps.length - 1, v + 1));
  }
  function prev() {
    setDir(-1);
    setI((v) => Math.max(0, v - 1));
  }

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="Tutorial de NegocioFlow"
        className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        initial={reduce ? false : { y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ type: "spring", stiffness: 380, damping: 32 }}
      >
        <div className="flex items-center justify-between px-5 pt-4">
          <div className="text-xs font-medium text-muted">
            Paso {i + 1} de {steps.length}
          </div>
          <button onClick={onClose} className="p-1 text-muted hover:text-ink" aria-label="Cerrar tutorial">
            <X size={20} />
          </button>
        </div>

        <div className="relative px-5 pt-3 pb-2 min-h-[330px]">
          <AnimatePresence mode="wait" initial={false} custom={dir}>
            <motion.div
              key={i}
              custom={dir}
              initial={reduce ? false : { x: dir * 40, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={reduce ? undefined : { x: dir * -40, opacity: 0 }}
              transition={{ duration: 0.22 }}
            >
              <div className="w-14 h-14 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center">
                <Icon size={28} />
              </div>
              <h2 className="text-xl font-bold mt-4">{step.title}</h2>
              <p className="text-sm text-muted mt-2 leading-relaxed">{step.body}</p>
              <ul className="mt-4 space-y-2">
                {step.tips.map((t) => (
                  <li key={t} className="flex gap-2 text-sm leading-snug">
                    {t.toLowerCase().includes("escan") ? (
                      <ScanBarcode size={16} className="text-brand-600 flex-shrink-0 mt-0.5" />
                    ) : (
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-500 flex-shrink-0 mt-[7px]" />
                    )}
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
              {step.go && (
                <button
                  onClick={() => {
                    onGo(step.go!.tab);
                    onClose();
                  }}
                  className="mt-5 text-sm font-semibold text-brand-700 underline underline-offset-2"
                >
                  {cap(step.go.label)} ahora
                </button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center justify-center gap-1.5 pb-3" aria-hidden>
          {steps.map((_, k) => (
            <span
              key={k}
              className={`h-1.5 rounded-full transition-all ${k === i ? "w-6 bg-brand-500" : "w-1.5 bg-line"}`}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 px-5 pb-5">
          {i > 0 ? (
            <button
              onClick={prev}
              className="flex items-center gap-1 px-4 py-2.5 rounded-lg border border-line text-sm font-medium"
            >
              <ArrowLeft size={16} /> Anterior
            </button>
          ) : (
            <button onClick={onClose} className="px-4 py-2.5 text-sm text-muted">
              Saltar
            </button>
          )}
          <button
            onClick={last ? onClose : next}
            className="ml-auto flex items-center gap-1 px-5 py-2.5 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-sm font-semibold"
          >
            {last ? "Empezar" : "Siguiente"} {!last && <ArrowRight size={16} />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
