"use client";
import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Landing from "../components/Landing";
import AuthScreen from "../components/AuthScreen";
import Onboarding from "../components/Onboarding";
import AppShell from "../components/AppShell";
import ResetPassword from "../components/ResetPassword";
import type { Business, BusinessRole } from "../lib/types";

function storageKey(userId: string) {
  return `nf_active_business_${userId}`;
}

export default function Page() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const [checkingBusiness, setCheckingBusiness] = useState(false);
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") setRecoveryMode(true);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) {
      setBusinesses([]);
      setActiveBusinessId(null);
      return;
    }
    let active = true;
    setCheckingBusiness(true);
    // Trae todos los negocios a los que el usuario tiene acceso: los que
    // creó como dueño, y aquellos donde fue agregado como vendedor (la
    // política de RLS de "businesses" ya filtra esto por nosotros).
    supabase
      .from("businesses")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        const list = ((data as Business[]) || []).filter((b) => b.onboarding_completed);
        setBusinesses(list);
        const stored = typeof window !== "undefined" ? window.localStorage.getItem(storageKey(session.user.id)) : null;
        const validStored = stored && list.some((b) => b.id === stored) ? stored : null;
        setActiveBusinessId(validStored || list[0]?.id || null);
        setCheckingBusiness(false);
      });
    return () => {
      active = false;
    };
  }, [session]);

  function selectBusiness(id: string) {
    setActiveBusinessId(id);
    if (session) window.localStorage.setItem(storageKey(session.user.id), id);
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">Cargando…</div>;
  }

  if (recoveryMode && session) {
    return <ResetPassword onDone={() => setRecoveryMode(false)} />;
  }

  if (!session) {
    if (!showAuth) return <Landing onGetStarted={() => setShowAuth(true)} onLogin={() => setShowAuth(true)} />;
    return <AuthScreen onBack={() => setShowAuth(false)} />;
  }

  if (checkingBusiness) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">Cargando…</div>;
  }

  if (businesses.length === 0) {
    return <Onboarding userId={session.user.id} onDone={() => window.location.reload()} />;
  }

  if (creatingBusiness) {
    return (
      <Onboarding
        userId={session.user.id}
        onDone={() => window.location.reload()}
        onCancel={() => setCreatingBusiness(false)}
      />
    );
  }

  const activeBusiness = businesses.find((b) => b.id === activeBusinessId) || businesses[0];
  const role: BusinessRole = activeBusiness.user_id === session.user.id ? "owner" : "vendedor";

  return (
    <AppShell
      key={activeBusiness.id}
      business={activeBusiness}
      role={role}
      userEmail={session.user.email}
      businesses={businesses}
      onSwitchBusiness={selectBusiness}
      onCreateBusiness={() => setCreatingBusiness(true)}
    />
  );
}
