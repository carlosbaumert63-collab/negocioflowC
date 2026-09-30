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
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
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
          <div className="text-lg font-bold">Crea una nueva contraseña</div>
        </div>
        <p className="text-sm text-muted mb-4">Para la cuenta de NegocioFlow.</p>

        <label className="block text-xs font-medium text-muted mb-1">Nueva contraseña</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-3"
          placeholder="••••••••"
        />
        <label className="block text-xs font-medium text-muted mb-1">Confirmar contraseña</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="w-full border border-line rounded-lg px-3 py-2 text-sm mb-3"
          placeholder="••••••••"
        />

        {error && <div className="text-xs text-red-600 mb-3">{error}</div>}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 bg-ink text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {loading && <Loader2 size={14} className="animate-spin" />}
          Guardar contraseña
        </button>
      </form>
    </div>
  );
}
