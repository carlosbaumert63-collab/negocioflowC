"use client";
import React, { useCallback, useEffect, useState } from "react";
import { Wallet, PlayCircle, Square, History, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Business, type CashRegister } from "../lib/types";
import { friendlyDbError } from "../lib/plan";
import { parseCLP } from "../lib/numbers";

interface RegisterSummary {
  opening: number;
  cash_sales: number;
  cash_sales_count: number;
  cash_expenses: number;
  expected: number;
}

function parseAmount(raw: string): number | null {
  const n = parseCLP(raw);
  return n !== null && n >= 0 ? n : null;
}

export default function CajaDiaria({ business }: { business: Business }) {
  const [current, setCurrent] = useState<CashRegister | null>(null);
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState("");
  const [countedAmount, setCountedAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [summary, setSummary] = useState<RegisterSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [closedResult, setClosedResult] = useState<{ difference: number; expected: number } | null>(null);

  const load = useCallback(async () => {
    const [openRes, historyRes] = await Promise.all([
      supabase.from("cash_registers").select("*").eq("business_id", business.id).eq("status", "open").maybeSingle(),
      supabase
        .from("cash_registers")
        .select("*")
        .eq("business_id", business.id)
        .eq("status", "closed")
        .order("closed_at", { ascending: false })
        .limit(10),
    ]);
    if (openRes.error) setError(friendlyDbError(openRes.error.message));
    setCurrent((openRes.data as CashRegister) || null);
    setHistory((historyRes.data as CashRegister[]) || []);
    setLoading(false);
  }, [business.id]);

  useEffect(() => {
    load();
  }, [load]);

  // El efectivo esperado lo calcula la base de datos: monto inicial + ventas
  // en efectivo cobradas durante el turno (los fiados cuentan cuando se pagan)
  // − gastos en efectivo del turno. Incluye los gastos aunque mire un vendedor.
  const refreshSummary = useCallback(async (registerId: string) => {
    const { data, error: err } = await supabase.rpc("cash_register_summary", { p_register_id: registerId });
    if (!err && data) setSummary(data as RegisterSummary);
  }, []);

  useEffect(() => {
    if (!current) {
      setSummary(null);
      return;
    }
    refreshSummary(current.id);
    const id = setInterval(() => refreshSummary(current.id), 20000);
    const onFocus = () => refreshSummary(current.id);
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [current, refreshSummary]);

  async function openRegister() {
    if (busy) return;
    const amount = openingAmount.trim() === "" ? 0 : parseAmount(openingAmount);
    if (amount === null) return setError("Ingresa un monto inicial válido.");
    setBusy(true);
    setError("");
    setClosedResult(null);
    const { error: err } = await supabase.from("cash_registers").insert({ business_id: business.id, opening_amount: amount });
    setBusy(false);
    if (err) {
      // Índice único: ya hay una caja abierta (p. ej. la abrió otra persona).
      if (/duplicate key|unique/i.test(err.message)) {
        setError("Ya hay una caja abierta para este negocio. La cargamos de nuevo.");
        load();
        return;
      }
      return setError(friendlyDbError(err.message));
    }
    setOpeningAmount("");
    load();
  }

  async function closeRegister() {
    if (!current || busy) return;
    const counted = parseAmount(countedAmount);
    if (counted === null) return setError("Ingresa el monto contado en caja.");
    setBusy(true);
    setError("");
    // El esperado se recalcula en el momento exacto del cierre, en el servidor.
    const { data, error: err } = await supabase.rpc("close_cash_register", {
      p_register_id: current.id,
      p_counted: counted,
      p_notes: notes,
    });
    setBusy(false);
    if (err) {
      setError(friendlyDbError(err.message));
      load();
      return;
    }
    const result = data as { difference: number; expected: number };
    setClosedResult({ difference: Number(result.difference), expected: Number(result.expected) });
    setCountedAmount("");
    setNotes("");
    load();
  }

  if (loading) {
    return <div className="text-sm text-muted py-8 text-center">Cargando…</div>;
  }

  const counted = parseAmount(countedAmount);
  const expected = summary?.expected ?? null;
  const diff = counted !== null && expected !== null ? counted - expected : null;

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Caja diaria</h1>
      <p className="text-sm text-muted mb-6">Abre la caja al empezar el día y ciérrala contando el efectivo real.</p>

      {closedResult && (
        <div
          role="status"
          className={`max-w-sm mb-6 text-sm px-4 py-3 rounded-xl border ${
            closedResult.difference === 0
              ? "bg-brand-50 border-brand-100 text-brand-700"
              : closedResult.difference > 0
              ? "bg-brand-50 border-brand-100 text-brand-700"
              : "bg-red-50 border-red-100 text-red-700"
          }`}
        >
          Caja cerrada.{" "}
          {closedResult.difference === 0
            ? "Cuadró exacto. 👌"
            : closedResult.difference > 0
            ? `Sobraron ${fmtCLP(closedResult.difference)}.`
            : `Faltaron ${fmtCLP(Math.abs(closedResult.difference))}.`}
        </div>
      )}

      {!current ? (
        <div className="bg-white border border-line rounded-xl p-5 max-w-sm mb-8">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <PlayCircle size={16} className="text-brand-600" /> Abrir caja
          </div>
          <label className="text-xs text-muted" htmlFor="caja-inicial">Monto inicial en efectivo</label>
          <input
            id="caja-inicial"
            inputMode="numeric"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            placeholder="Ej. 20.000"
            className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm"
          />
          {error && <div role="alert" className="text-sm text-red-600 mt-3">{error}</div>}
          <button
            onClick={openRegister}
            disabled={busy}
            className="w-full mt-4 flex items-center justify-center gap-2 bg-brand-500 text-white font-semibold py-2.5 rounded-lg disabled:opacity-60"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {busy ? "Abriendo…" : "Abrir caja"}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl p-5 max-w-sm mb-8">
          <div className="flex items-center justify-between gap-2 mb-3">
            <div className="flex items-center gap-2 text-sm font-semibold text-brand-700">
              <Wallet size={16} /> Caja abierta
            </div>
            <div className="text-xs text-muted">
              desde {new Date(current.opened_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
            </div>
          </div>

          <div className="text-xs text-muted">Efectivo esperado ahora</div>
          <div className="text-2xl font-bold text-brand-600 mb-3">{expected === null ? "…" : fmtCLP(expected)}</div>

          {summary && (
            <div className="text-xs space-y-1 bg-surface rounded-lg p-3 mb-4">
              <div className="flex justify-between">
                <span className="text-muted">Monto inicial</span>
                <span>{fmtCLP(summary.opening)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">
                  + Ventas en efectivo ({summary.cash_sales_count})
                </span>
                <span>{fmtCLP(summary.cash_sales)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">− Gastos en efectivo</span>
                <span>{fmtCLP(summary.cash_expenses)}</span>
              </div>
              <div className="text-[11px] text-muted pt-1">Las ventas al fiado se suman cuando el cliente paga.</div>
            </div>
          )}

          <div className="border-t border-line pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Square size={14} /> Cerrar caja
            </div>
            <label className="text-xs text-muted" htmlFor="caja-contado">Efectivo contado (real)</label>
            <input
              id="caja-contado"
              inputMode="numeric"
              value={countedAmount}
              onChange={(e) => setCountedAmount(e.target.value)}
              placeholder="Cuenta el efectivo y anota el total"
              className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm"
            />
            {diff !== null && (
              <div className={`text-xs mt-2 ${diff === 0 ? "text-muted" : diff > 0 ? "text-brand-600" : "text-red-600"}`}>
                {diff === 0 ? "Cuadra exacto." : diff > 0 ? `Sobran ${fmtCLP(diff)}.` : `Faltan ${fmtCLP(Math.abs(diff))}.`}
              </div>
            )}
            <label className="text-xs text-muted mt-3 block" htmlFor="caja-notas">Notas (opcional)</label>
            <textarea
              id="caja-notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm"
            />
            {error && <div role="alert" className="text-sm text-red-600 mt-3">{error}</div>}
            <button
              onClick={closeRegister}
              disabled={busy}
              className="w-full mt-4 flex items-center justify-center gap-2 bg-ink text-white font-semibold py-2.5 rounded-lg disabled:opacity-60"
            >
              {busy && <Loader2 size={15} className="animate-spin" />}
              {busy ? "Cerrando…" : "Cerrar caja"}
            </button>
          </div>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-muted mb-3">
            <History size={14} /> Historial de cierres
          </div>
          <div className="bg-white border border-line rounded-xl overflow-hidden">
            {history.map((h) => {
              const d = Number(h.difference || 0);
              return (
                <div key={h.id} className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0 text-sm">
                  <div>
                    <div className="font-medium">
                      {h.closed_at ? new Date(h.closed_at).toLocaleString("es-CL", { dateStyle: "medium", timeStyle: "short" }) : "—"}
                    </div>
                    <div className="text-xs text-muted">
                      Esperado {fmtCLP(h.expected_amount || 0)} · Contado {fmtCLP(h.counted_amount || 0)}
                    </div>
                    {h.notes && <div className="text-xs text-muted mt-0.5 italic">“{h.notes}”</div>}
                  </div>
                  <div className={`text-sm font-semibold ${d === 0 ? "text-muted" : d > 0 ? "text-brand-600" : "text-red-600"}`}>
                    {d === 0 ? "Cuadrado" : d > 0 ? `+${fmtCLP(d)}` : `−${fmtCLP(Math.abs(d))}`}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
