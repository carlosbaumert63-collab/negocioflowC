"use client";
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";

type Mode = "login" | "signup" | "forgot";

export default function AuthScreen({ onBack }: { onBack?: () => void }) {
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    setInfo("");
    if (!email || (mode !== "forgot" && !password)) return;
    if (mode === "signup" && !acceptedTerms) {
      setError("Debes aceptar los Términos de servicio y la Política de privacidad para crear tu cuenta.");
      return;
    }
    setLoading(true);

    if (mode === "login") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message);
    } else if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) setError(error.message);
      else setInfo("Cuenta creada. Revisa tu correo para confirmar tu cuenta y luego inicia sesión.");
    } else if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });
      if (error) setError(error.message);
      else setInfo("Te enviamos un link para recuperar tu contraseña.");
    }
    setLoading(false);
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

        <label className="text-xs text-muted">Correo</label>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="tu@correo.com"
          className="w-full mt-1 mb-4 px-3 py-2.5 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
        />

        {mode !== "forgot" && (
          <>
            <label className="text-xs text-muted">Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              placeholder="••••••••"
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

        {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
        {info && <div className="text-sm text-brand-700 mb-3">{info}</div>}

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
              <button onClick={() => setMode("login")} className="text-brand-700 font-medium">
                Ya tengo cuenta
              </button>
            </div>
          )}
          {mode !== "signup" && (
            <div>
              <button onClick={() => setMode("signup")} className="text-brand-700 font-medium">
                Crear cuenta nueva
              </button>
            </div>
          )}
          {mode !== "forgot" && (
            <div>
              <button onClick={() => setMode("forgot")} className="text-muted">
                Olvidé mi contraseña
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
