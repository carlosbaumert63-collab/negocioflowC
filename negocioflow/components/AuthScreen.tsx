"use client";
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Mode = "login" | "signup" | "forgot";

// Los mensajes de Supabase vienen en inglés: los traducimos.
function authErrorEs(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Correo o contraseña incorrectos.";
  if (m.includes("email not confirmed")) return "Aún no confirmas tu correo. Revisa tu bandeja de entrada (y spam).";
  if (m.includes("user already registered") || m.includes("already been registered"))
    return "Ya existe una cuenta con ese correo. Inicia sesión o recupera tu contraseña.";
  if (m.includes("password should be at least") || m.includes("weak password"))
    return "La contraseña es muy débil. Usa al menos 8 caracteres, mezclando letras y números.";
  if (m.includes("rate limit") || m.includes("too many requests") || m.includes("security purposes"))
    return "Demasiados intentos. Espera un minuto y vuelve a intentar.";
  if (m.includes("unable to validate email") || m.includes("invalid email")) return "Ese correo no parece válido.";
  if (m.includes("failed to fetch") || m.includes("network")) return "No hay conexión a internet. Revisa tu conexión.";
  return message;
}

export default function AuthScreen({ onBack }: { onBack?: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (loading) return;
    setError("");
    setInfo("");
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) return setError("Ingresa tu correo.");
    if (mode !== "forgot" && !password) return setError("Ingresa tu contraseña.");
    if (mode === "signup" && password.length < 8) return setError("La contraseña debe tener al menos 8 caracteres.");
    if (mode === "signup" && !acceptedTerms) {
      setError("Debes aceptar los Términos de servicio y la Política de privacidad para crear tu cuenta.");
      return;
    }
    setLoading(true);
    // Sin internet, Supabase LANZA una excepción en vez de devolver un error:
    // sin este try/finally el botón quedaba en "Cargando…" para siempre.
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
        if (error) setError(authErrorEs(error.message));
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) setError(authErrorEs(error.message));
        else setInfo("Cuenta creada. Revisa tu correo (y la carpeta de spam) para confirmarla, y luego inicia sesión.");
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
          redirectTo: window.location.origin,
        });
        if (error) setError(authErrorEs(error.message));
        // Mismo mensaje exista o no la cuenta (no revelamos qué correos están registrados).
        else setInfo("Si ese correo tiene una cuenta, te enviamos un link para crear una nueva contraseña.");
      }
    } catch (err: any) {
      setError(authErrorEs(err?.message || "No hay conexión a internet. Revisa tu conexión."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-5">
      <div className="w-full max-w-sm bg-white border border-line rounded-2xl p-7 shadow-sm">
        {onBack && (
          <button onClick={onBack} className="text-sm text-muted mb-4">
            ← Volver
          </button>
        )}
        <div className="text-2xl font-bold text-ink">NegocioFlow</div>
        <div className="text-sm text-muted mt-1 mb-6">
          {mode === "login" && "Inicia sesión en tu negocio"}
          {mode === "signup" && "Crea tu cuenta gratis"}
          {mode === "forgot" && "Recupera tu contraseña"}
        </div>

        <label className="text-xs text-muted" htmlFor="auth-email">Correo</label>
        <input
          id="auth-email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder="tu@correo.com"
          className="w-full mt-1 mb-4 px-3 py-2.5 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        {mode !== "forgot" && (
          <>
            <label className="text-xs text-muted" htmlFor="auth-password">Contraseña</label>
            <input
              id="auth-password"
              type="password"
              autoComplete={mode === "signup" ? "new-password" : "current-password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder={mode === "signup" ? "Mínimo 8 caracteres" : "••••••••"}
              className="w-full mt-1 mb-4 px-3 py-2.5 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </>
        )}

        {mode === "signup" && (
          <label className="flex items-start gap-2 mb-4 text-xs text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={acceptedTerms}
              onChange={(e) => setAcceptedTerms(e.target.checked)}
              className="mt-0.5"
            />
            <span>
              Acepto los{" "}
              <a href="/terminos" target="_blank" className="text-brand-700 font-medium">
                Términos de servicio
              </a>{" "}
              y la{" "}
              <a href="/privacidad" target="_blank" className="text-brand-700 font-medium">
                Política de privacidad
              </a>
              .
            </span>
          </label>
        )}

        {error && <div role="alert" className="text-sm text-red-600 mb-3">{error}</div>}
        {info && <div role="status" className="text-sm text-brand-700 mb-3">{info}</div>}

        <button
          onClick={handleSubmit}
          disabled={loading || (mode === "signup" && !acceptedTerms)}
          className="w-full py-2.5 rounded-lg bg-brand-500 text-white font-semibold text-sm hover:bg-brand-600 transition disabled:opacity-60"
        >
          {loading
            ? "Cargando…"
            : mode === "login"
            ? "Iniciar sesión"
            : mode === "signup"
            ? "Crear cuenta"
            : "Enviar link de recuperación"}
        </button>

        <div className="text-xs text-muted mt-5 text-center space-y-1">
          {mode !== "login" && (
            <div>
              <button onClick={() => { setMode("login"); setError(""); setInfo(""); }} className="text-brand-700 font-medium">
                Ya tengo cuenta
              </button>
            </div>
          )}
          {mode !== "signup" && (
            <div>
              <button onClick={() => { setMode("signup"); setError(""); setInfo(""); }} className="text-brand-700 font-medium">
                Crear cuenta nueva
              </button>
            </div>
          )}
          {mode !== "forgot" && (
            <div>
              <button onClick={() => { setMode("forgot"); setError(""); setInfo(""); }} className="text-muted">
                Olvidé mi contraseña
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
