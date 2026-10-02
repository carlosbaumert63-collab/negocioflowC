"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabaseClient";
import Landing from "../components/Landing";
import AuthScreen from "../components/AuthScreen";
import Onboarding from "../components/Onboarding";
import AppShell from "../components/AppShell";
import ResetPassword from "../components/ResetPassword";
import type { Business, BusinessRole } from "../lib/types";
import { safeStorage } from "../lib/safeStorage";

function storageKey(userId: string) {
  return `nf_active_business_${userId}`;
}

const RECOVERY_FLAG = "nf_password_recovery";

export default function Page() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);
  const [loadedForUser, setLoadedForUser] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [creatingBusiness, setCreatingBusiness] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);
  const loadSeq = useRef(0);

  // Solo nos importa QUIÉN es el usuario. Supabase entrega un objeto de sesión
  // nuevo en cada renovación de token (~1 vez por hora); si dependiéramos del
  // objeto completo, la app entera se recargaría y el usuario perdería lo que
  // estaba escribiendo.
  const userId: string | null = session?.user?.id ?? null;

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    // Si el usuario recarga la página a mitad de cambiar su contraseña,
    // seguimos en modo recuperación en vez de dejarlo entrar sin cambiarla.
    if (safeStorage.get(RECOVERY_FLAG) === "1") setRecoveryMode(true);
    // Un vendedor invitado entra con un link (#...type=invite) que inicia
    // sesión pero nunca le pidió contraseña: se la pedimos ahora, si no, no
    // podría volver a entrar después de cerrar sesión.
    if (typeof window !== "undefined" && /(^|[#&?])type=invite(&|$)/.test(window.location.hash)) {
      safeStorage.set(RECOVERY_FLAG, "1");
      setRecoveryMode(true);
    }
    const { data: listener } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "PASSWORD_RECOVERY") {
        safeStorage.set(RECOVERY_FLAG, "1");
        setRecoveryMode(true);
      }
      if (event === "SIGNED_OUT") {
        safeStorage.remove(RECOVERY_FLAG);
        setRecoveryMode(false);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  const loadBusinesses = useCallback(
    async (uid: string, preferId?: string) => {
      const seq = ++loadSeq.current;
      // Volvemos al estado "cargando" (si no, al reintentar se vería por un
      // instante el onboarding, porque la lista de negocios aún está vacía).
      setLoadedForUser(null);
      setLoadError(false);
      // Trae todos los negocios a los que el usuario tiene acceso: los que
      // creó como dueño, y aquellos donde fue agregado como vendedor (la
      // política de RLS de "businesses" ya filtra esto por nosotros).
      const { data, error } = await supabase.from("businesses").select("*").order("created_at", { ascending: true });
      // Si mientras tanto cambió el usuario o se pidió otra carga, se ignora esta.
      if (seq !== loadSeq.current) return;
      if (error) {
        // Importante: NO tratamos un error de red como "no tiene negocios",
        // porque eso mandaría a un usuario existente al onboarding.
        console.error("businesses load", error);
        setLoadError(true);
        setLoadedForUser(uid);
        return;
      }
      const list = ((data as Business[]) || []).filter((b) => b.onboarding_completed);
      setBusinesses(list);
      const stored = preferId || safeStorage.get(storageKey(uid));
      const validStored = stored && list.some((b) => b.id === stored) ? stored : null;
      const nextId = validStored || list[0]?.id || null;
      setActiveBusinessId(nextId);
      if (nextId) safeStorage.set(storageKey(uid), nextId);
      setLoadedForUser(uid);
    },
    []
  );

  useEffect(() => {
    if (!userId) {
      setBusinesses([]);
      setActiveBusinessId(null);
      setLoadedForUser(null);
      return;
    }
    loadBusinesses(userId);
  }, [userId, loadBusinesses]);

  function selectBusiness(id: string) {
    setActiveBusinessId(id);
    if (userId) safeStorage.set(storageKey(userId), id);
  }

  // Al crear un negocio, lo dejamos seleccionado y recargamos la lista sin
  // recargar toda la página.
  async function handleBusinessCreated(newId: string) {
    if (!userId) return;
    safeStorage.set(storageKey(userId), newId);
    setCreatingBusiness(false);
    await loadBusinesses(userId, newId);
  }

  // Cuando un negocio se edita (p. ej. la meta de ventas), actualizamos la
  // lista para que el cambio no se pierda al cambiar de negocio.
  function handleBusinessUpdated(updated: Business) {
    setBusinesses((prev) => prev.map((b) => (b.id === updated.id ? { ...b, ...updated } : b)));
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">Cargando…</div>;
  }

  if (recoveryMode && session) {
    return (
      <ResetPassword
        onDone={() => {
          safeStorage.remove(RECOVERY_FLAG);
          setRecoveryMode(false);
        }}
      />
    );
  }

  if (!session) {
    if (!showAuth) return <Landing onGetStarted={() => setShowAuth(true)} onLogin={() => setShowAuth(true)} />;
    return <AuthScreen onBack={() => setShowAuth(false)} />;
  }

  if (loadedForUser !== userId) {
    return <div className="min-h-screen flex items-center justify-center text-sm text-muted">Cargando…</div>;
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-5">
        <div className="w-full max-w-sm bg-white border border-line rounded-2xl p-7 text-center">
          <div className="font-semibold text-ink">No pudimos cargar tus negocios</div>
          <p className="text-sm text-muted mt-1.5">Revisa tu conexión a internet e intenta de nuevo.</p>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => userId && loadBusinesses(userId)}
              className="flex-1 py-2.5 rounded-lg bg-brand-500 text-white font-semibold text-sm"
            >
              Reintentar
            </button>
            <button
              onClick={() => supabase.auth.signOut()}
              className="flex-1 py-2.5 rounded-lg border border-line text-sm text-muted"
            >
              Salir
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (businesses.length === 0) {
    return <Onboarding userId={session.user.id} onDone={handleBusinessCreated} />;
  }

  if (creatingBusiness) {
    return (
      <Onboarding
        userId={session.user.id}
        onDone={handleBusinessCreated}
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
      onBusinessUpdated={handleBusinessUpdated}
    />
  );
}
