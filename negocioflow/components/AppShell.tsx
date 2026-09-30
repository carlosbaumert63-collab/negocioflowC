"use client";
import React, { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  LayoutDashboard,
  Receipt,
  Package,
  Wallet,
  BarChart3,
  LogOut,
  MoreHorizontal,
  Users,
  Truck,
  ShoppingBag,
  TrendingUp,
  X,
  Crown,
  Coins,
  UserCog,
  ChevronDown,
  Plus,
  Check,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import type { Business, BusinessRole } from "../lib/types";
import { PlanProvider, usePlan } from "./PlanContext";
import UpgradePanel from "./UpgradePanel";
import Dashboard from "./Dashboard";
import Ventas from "./Ventas";
import Productos from "./Productos";
import Gastos from "./Gastos";
import Reportes from "./Reportes";
import Clientes from "./Clientes";
import Proveedores from "./Proveedores";
import Compras from "./Compras";
import FlujoCaja from "./FlujoCaja";
import CajaDiaria from "./CajaDiaria";
import Equipo from "./Equipo";

type Tab =
  | "dashboard"
  | "ventas"
  | "productos"
  | "gastos"
  | "reportes"
  | "clientes"
  | "proveedores"
  | "compras"
  | "flujo"
  | "caja"
  | "equipo";

const MAIN_TABS: { key: Tab; label: string; icon: any; ownerOnly?: boolean }[] = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "ventas", label: "Ventas", icon: Receipt },
  { key: "productos", label: "Productos", icon: Package },
  { key: "gastos", label: "Gastos", icon: Wallet, ownerOnly: true },
  { key: "reportes", label: "Reportes", icon: BarChart3, ownerOnly: true },
];

const MORE_TABS: { key: Tab; label: string; icon: any; ownerOnly?: boolean }[] = [
  { key: "clientes", label: "Clientes", icon: Users, ownerOnly: true },
  { key: "proveedores", label: "Proveedores", icon: Truck, ownerOnly: true },
  { key: "compras", label: "Compras", icon: ShoppingBag, ownerOnly: true },
  { key: "flujo", label: "Flujo de caja", icon: TrendingUp, ownerOnly: true },
  { key: "caja", label: "Caja diaria", icon: Coins },
  { key: "equipo", label: "Equipo", icon: UserCog, ownerOnly: true },
];

export default function AppShell({
  business,
  userEmail,
  role = "owner",
  businesses,
  onSwitchBusiness,
  onCreateBusiness,
}: {
  business: Business;
  userEmail: string;
  role?: BusinessRole;
  businesses: Business[];
  onSwitchBusiness: (id: string) => void;
  onCreateBusiness: () => void;
}) {
  return (
    <PlanProvider business={business} role={role}>
      <AppShellInner
        business={business}
        userEmail={userEmail}
        businesses={businesses}
        onSwitchBusiness={onSwitchBusiness}
        onCreateBusiness={onCreateBusiness}
      />
    </PlanProvider>
  );
}

function AppShellInner({
  business,
  userEmail,
  businesses,
  onSwitchBusiness,
  onCreateBusiness,
}: {
  business: Business;
  userEmail: string;
  businesses: Business[];
  onSwitchBusiness: (id: string) => void;
  onCreateBusiness: () => void;
}) {
  const { isPro, isOwner, daysLeft, showUpgrade, goToPlan, closeUpgrade, refreshSubscription } = usePlan();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [showMore, setShowMore] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [pendingNotice, setPendingNotice] = useState(false);
  const mainTabs = isOwner ? MAIN_TABS : MAIN_TABS.filter((t) => !t.ownerOnly);
  const moreTabs = isOwner ? MORE_TABS : MORE_TABS.filter((t) => !t.ownerOnly);
  const allTabs = [...mainTabs, ...moreTabs];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgrade") === "pending") {
      setPendingNotice(true);
      window.history.replaceState({}, "", window.location.pathname);
      const t = setTimeout(() => {
        refreshSubscription();
        window.location.reload();
      }, 4000);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderTab() {
    switch (tab) {
      case "dashboard":
        return <Dashboard business={business} />;
      case "ventas":
        return <Ventas business={business} />;
      case "productos":
        return <Productos business={business} />;
      case "gastos":
        return <Gastos business={business} />;
      case "reportes":
        return <Reportes business={business} />;
      case "clientes":
        return <Clientes business={business} />;
      case "proveedores":
        return <Proveedores business={business} />;
      case "compras":
        return <Compras business={business} />;
      case "flujo":
        return <FlujoCaja business={business} />;
      case "caja":
        return <CajaDiaria business={business} />;
      case "equipo":
        return <Equipo business={business} />;
      default:
        return null;
    }
  }

  return (
    <div className="min-h-screen bg-surface flex">
      {/* sidebar (desktop) */}
      <div className="hidden md:flex flex-col w-60 border-r border-line bg-white p-4 flex-shrink-0">
        <div className="font-bold text-lg px-2 mb-3">NegocioFlow</div>

        <div className="relative mb-4">
          <button
            onClick={() => setShowSwitcher((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-line text-left hover:bg-surface"
          >
            <span className="text-sm font-medium truncate">{business.name}</span>
            <ChevronDown size={14} className="text-muted flex-shrink-0" />
          </button>
          {showSwitcher && (
            <div className="absolute left-0 right-0 mt-1 bg-white border border-line rounded-lg shadow-lg z-20 py-1">
              {businesses.map((b) => (
                <button
                  key={b.id}
                  onClick={() => {
                    setShowSwitcher(false);
                    if (b.id !== business.id) onSwitchBusiness(b.id);
                  }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm hover:bg-surface text-left"
                >
                  <span className="truncate">{b.name}</span>
                  {b.id === business.id && <Check size={14} className="text-brand-600 flex-shrink-0" />}
                </button>
              ))}
              <div className="border-t border-line mt-1 pt-1">
                <button
                  onClick={() => {
                    setShowSwitcher(false);
                    onCreateBusiness();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-brand-600 hover:bg-surface text-left"
                >
                  <Plus size={14} /> Crear otro negocio
                </button>
              </div>
            </div>
          )}
        </div>

        {isOwner && (
          <button
            onClick={goToPlan}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mb-4 ${
              isPro ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700"
            }`}
          >
            <Crown size={14} />
            {isPro ? "Plan Pro" : "Plan Free — mejorar"}
          </button>
        )}
        {!isOwner && (
          <div
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium mb-4 ${
              isPro ? "bg-brand-50 text-brand-700" : "bg-surface text-muted"
            }`}
          >
            <UserCog size={14} />
            Vendedor{isPro ? " · Plan Pro" : ""}
          </div>
        )}

        <div className="flex flex-col gap-1">
          {allTabs.map((t) => {
            const Icon = t.icon;
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  active ? "text-brand-700" : "text-muted hover:bg-surface transition-colors"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-pill"
                    className="absolute inset-0 bg-brand-50 rounded-lg"
                    transition={{ type: "spring", stiffness: 500, damping: 36 }}
                  />
                )}
                <Icon size={18} className="relative z-10" />
                <span className="relative z-10">{t.label}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-auto">
          <button
            onClick={() => supabase.auth.signOut()}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted"
          >
            <LogOut size={16} /> Salir
          </button>
        </div>
      </div>

      {/* main content */}
      <div className="flex-1 min-w-0">
        {/* mobile top bar */}
        <div className="md:hidden flex items-center justify-between px-4 py-3 bg-white border-b border-line">
          <div className="min-w-0">
            <div className="font-bold text-base">NegocioFlow</div>
            <button
              onClick={() => setShowSwitcher(true)}
              className="flex items-center gap-1 text-xs text-muted max-w-[50vw]"
            >
              <span className="truncate">{business.name}</span>
              {businesses.length > 1 && <ChevronDown size={12} className="flex-shrink-0" />}
            </button>
          </div>
          <div className="flex items-center gap-3">
            {isOwner && (
              <button
                onClick={goToPlan}
                className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  isPro ? "bg-brand-50 text-brand-700" : "bg-amber-50 text-amber-700"
                }`}
              >
                {isPro ? "Pro" : "Free"}
              </button>
            )}
            <button onClick={() => supabase.auth.signOut()} className="text-muted">
              <LogOut size={18} />
            </button>
          </div>
        </div>

        {/* selector de negocio (mobile) */}
        <AnimatePresence>
          {showSwitcher && (
            <motion.div
              className="md:hidden fixed inset-0 bg-black/40 z-50 flex items-start justify-center pt-16 px-4"
              onClick={() => setShowSwitcher(false)}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-white rounded-xl w-full max-w-sm overflow-hidden"
                onClick={(e) => e.stopPropagation()}
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -10, opacity: 0 }}
              >
                {businesses.map((b) => (
                  <button
                    key={b.id}
                    onClick={() => {
                      setShowSwitcher(false);
                      if (b.id !== business.id) onSwitchBusiness(b.id);
                    }}
                    className="w-full flex items-center justify-between gap-2 px-4 py-3 text-sm border-b border-line last:border-0 text-left"
                  >
                    <span className="truncate">{b.name}</span>
                    {b.id === business.id && <Check size={14} className="text-brand-600 flex-shrink-0" />}
                  </button>
                ))}
                <button
                  onClick={() => {
                    setShowSwitcher(false);
                    onCreateBusiness();
                  }}
                  className="w-full flex items-center gap-2 px-4 py-3 text-sm text-brand-600 text-left"
                >
                  <Plus size={14} /> Crear otro negocio
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {pendingNotice && (
          <div className="bg-brand-50 text-brand-700 text-sm px-4 py-2.5 text-center">
            Estamos confirmando tu pago… esto puede tardar unos segundos.
          </div>
        )}
        {isPro && daysLeft !== null && daysLeft <= 7 && (
          <div className="bg-amber-50 text-amber-700 text-sm px-4 py-2.5 text-center">
            Tu plan Pro vence en {daysLeft} día(s).{" "}
            <button onClick={goToPlan} className="underline font-medium">
              Renovar
            </button>
          </div>
        )}

        <div className="p-4 sm:p-6 pb-24 md:pb-6 max-w-5xl mx-auto overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            >
              {renderTab()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* bottom nav (mobile) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-line flex justify-around py-2 pb-[calc(env(safe-area-inset-bottom)+8px)]">
        {mainTabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.key;
          return (
            <motion.button
              key={t.key}
              onClick={() => setTab(t.key)}
              whileTap={{ scale: 0.9 }}
              className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
                active ? "text-brand-600" : "text-muted"
              }`}
            >
              <motion.span animate={active ? { y: -2, scale: 1.08 } : { y: 0, scale: 1 }} transition={{ type: "spring", stiffness: 500, damping: 30 }}>
                <Icon size={20} />
              </motion.span>
              {t.label}
            </motion.button>
          );
        })}
        {moreTabs.length > 0 && (
          <button
            onClick={() => setShowMore(true)}
            className={`flex flex-col items-center gap-0.5 px-2 py-1 text-[10px] font-medium ${
              moreTabs.some((t) => t.key === tab) ? "text-brand-600" : "text-muted"
            }`}
          >
            <MoreHorizontal size={20} />
            Más
          </button>
        )}
      </div>

      {/* "Más" bottom sheet (mobile) */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            className="md:hidden fixed inset-0 bg-black/40 z-50 flex items-end"
            onClick={() => setShowMore(false)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="bg-white rounded-t-2xl w-full p-4 pb-8"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="font-bold text-sm">Más secciones</div>
                <button onClick={() => setShowMore(false)}>
                  <X size={18} className="text-muted" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {moreTabs.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button
                      key={t.key}
                      onClick={() => {
                        setTab(t.key);
                        setShowMore(false);
                      }}
                      className="flex items-center gap-2 px-3 py-3 rounded-lg border border-line text-sm font-medium"
                    >
                      <Icon size={16} />
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* upgrade modal */}
      <AnimatePresence>
        {showUpgrade && (
          <motion.div
            className="fixed inset-0 bg-black/40 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.div
              className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-5 max-h-[90vh] overflow-y-auto"
              initial={{ y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 24, opacity: 0, scale: 0.98 }}
              transition={{ type: "spring", stiffness: 420, damping: 38 }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="font-bold text-lg">NegocioFlow Pro</div>
                <button onClick={closeUpgrade}>
                  <X size={18} className="text-muted" />
                </button>
              </div>
              <UpgradePanel renewal={isPro} />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
