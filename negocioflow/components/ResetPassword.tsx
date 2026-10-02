"use client";
import React, { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";

export default function ResetPassword({ onDone }: { onDone: () => void }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    let err: { message: string } | null = null;
    try {
      ({ error: err } = await supabase.auth.updateUser({ password }));
    } catch (e: any) {
      err = { message: /fetch|network/i.test(e?.message || "") ? "No hay conexión a internet. Intenta de nuevo." : e?.message || "Error inesperado." };
    }
    setLoading(false);
    if (err) {
      setError(
        /same.*password|different from the old/i.test(err.message)
          ? "La nueva contraseña debe ser distinta a la anterior."
          : /weak|at least/i.test(err.message)
          ? "Esa contraseña es muy débil. Usa al menos 8 caracteres, mezclando letras y números."
          : err.message
      );
      return;
    }
    // Limpia el #token del link para que no quede en el historial.
    if (typeof window !== "undefined" && window.location.hash) {
      window.history.replaceState({}, "", window.location.pathname);
    }
    setDone(true);
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
        <div className="bg-white border border-line rounded-xl p-6 max-w-sm w-full text-center">
          <div className="text-lg font-bold mb-2">Contraseña actualizada</div>
          <p className="text-sm text-muted mb-4">Ya puedes seguir usando tu cuenta con normalidad.</p>
          <button onClick={onDone} className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium">
            Continuar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-surface">
      <form onSubmit={handleSubmit} className="bg-white border border-line rounded-xl p-6 max-w-sm w-full">
        <div className="flex items-center gap-2 mb-1">
          <KeyRound size={18} />
          <div className="text-lg font-bold">Crea tu contraseña</div>
        </div>
        <p className="text-sm text-muted mb-4">La usarás para entrar a NegocioFlow desde cualquier dispositivo.</p>

        <label className="block text-xs font-medium text-muted mb-1" htmlFor="rp-pass">Nueva contraseña</label>
        <input
          id="rp-pass"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-3"
          placeholder="••••••••"
        />
        <label className="block text-xs font-medium text-muted mb-1" htmlFor="rp-confirm">Confirmar contraseña</label>
        <input
          id="rp-confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-3"
          placeholder="••••••••"
        />

        {error && <div role="alert" className="text-xs text-red-600 mb-3">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-ink text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Guardar contraseña
        </button>
        <button
          type="button"
          onClick={() => supabase.auth.signOut()}
          className="w-full mt-3 text-sm text-muted hover:text-ink"
        >
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}
