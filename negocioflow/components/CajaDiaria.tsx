"use client";
import React, { useEffect, useState } from "react";
import { Wallet, PlayCircle, Square, History } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Business, type CashRegister } from "../lib/types";
import { friendlyDbError } from "../lib/plan";

export default function CajaDiaria({ business }: { business: Business }) {
  const [current, setCurrent] = useState<CashRegister | null>(null);
  const [history, setHistory] = useState<CashRegister[]>([]);
  const [loading, setLoading] = useState(true);
  const [openingAmount, setOpeningAmount] = useState("");
  const [countedAmount, setCountedAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [expected, setExpected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    const [{ data: openData }, { data: historyData }] = await Promise.all([
      supabase
        .from("cash_registers")
        .select("*")
        .eq("business_id", business.id)
        .eq("status", "open")
        .maybeSingle(),
      supabase
        .from("cash_registers")
        .select("*")
        .eq("business_id", business.id)
        .eq("status", "closed")
        .order("closed_at", { ascending: false })
        .limit(10),
    ]);
    setCurrent((openData as CashRegister) || null);
    setHistory((historyData as CashRegister[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  useEffect(() => {
    if (!current) return;
    let active = true;

    async function computeExpected() {
      // Nota: si hay gastos en efectivo registrados durante el turno y quien
      // ve esta pantalla es un vendedor (no el dueño), esos gastos no se
      // pueden leer (son solo del dueño) y por lo tanto no se descuentan acá.
      const [{ data: cashSales }, { data: cashExpenses }] = await Promise.all([
        supabase
          .from("sales")
          .select("total")
          .eq("business_id", business.id)
          .eq("payment_method", "efectivo")
          .gte("created_at", current!.opened_at),
        supabase
          .from("expenses")
          .select("amount")
          .eq("business_id", business.id)
          .eq("payment_method", "efectivo")
          .gte("created_at", current!.opened_at),
      ]);
      if (!active) return;
      const salesTotal = (cashSales || []).reduce((s: number, r: any) => s + Number(r.total), 0);
      const expensesTotal = (cashExpenses || []).reduce((s: number, r: any) => s + Number(r.amount), 0);
      setExpected(Number(current!.opening_amount) + salesTotal - expensesTotal);
    }

    computeExpected();
    const id = setInterval(computeExpected, 20000);
    return () => {
      active = false;
      clearInterval(id);
    };
  }, [current, business.id]);

  async function openRegister() {
    const amount = Number(openingAmount) || 0;
    setBusy(true);
    setError("");
    const { error: err } = await supabase
      .from("cash_registers")
      .insert({ business_id: business.id, opening_amount: amount });
    setBusy(false);
    if (err) return setError(friendlyDbError(err.message));
    setOpeningAmount("");
    load();
  }

  async function closeRegister() {
    if (!current) return;
    const counted = Number(countedAmount);
    if (!Number.isFinite(counted) || countedAmount.trim() === "") {
      setError("Ingresa el monto contado en caja.");
      return;
    }
    setBusy(true);
    setError("");
    const difference = counted - expected;
    const { error: err } = await supabase
      .from("cash_registers")
      .update({
        status: "closed",
        closed_at: new Date().toISOString(),
        expected_amount: expected,
        counted_amount: counted,
        difference,
        notes: notes || null,
      })
      .eq("id", current.id);
    setBusy(false);
    if (err) return setError(friendlyDbError(err.message));
    setCountedAmount("");
    setNotes("");
    load();
  }

  if (loading) {
    return <div className="text-sm text-muted py-8 text-center">Cargando…</div>;
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Caja diaria</h1>
      <p className="text-sm text-muted mb-6">Abre la caja al empezar el día y ciérrala contando el efectivo real.</p>

      {!current ? (
        <div className="bg-white border border-line rounded-xl p-5 max-w-sm">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3">
            <PlayCircle size={16} className="text-brand-600" /> Abrir caja
          </div>
          <label className="text-xs text-muted">Monto inicial en efectivo</label>
          <input
            type="number"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            placeholder="Ej. 20000"
            className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm"
          />
          {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
          <button
            onClick={openRegister}
            disabled={busy}
            className="w-full mt-4 bg-brand-500 text-white font-semibold py-2.5 rounded-lg disabled:opacity-60"
          >
            {busy ? "Abriendo…" : "Abrir caja"}
          </button>
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl p-5 max-w-sm mb-8">
          <div className="flex items-center gap-2 text-sm font-semibold mb-3 text-brand-700">
            <Wallet size={16} /> Caja abierta
          </div>
          <div className="text-xs text-muted">Monto inicial</div>
          <div className="text-base font-medium mb-3">{fmtCLP(current.opening_amount)}</div>
          <div className="text-xs text-muted">Efectivo esperado ahora</div>
          <div className="text-2xl font-bold text-brand-600 mb-1">{fmtCLP(expected)}</div>
          <div className="text-[11px] text-muted mb-4">
            Monto inicial + ventas en efectivo − gastos en efectivo del turno.
          </div>

          <div className="border-t border-line pt-4">
            <div className="flex items-center gap-2 text-sm font-semibold mb-3">
              <Square size={14} /> Cerrar caja
            </div>
            <label className="text-xs text-muted">Efectivo contado (real)</label>
            <input
              type="number"
              value={countedAmount}
              onChange={(e) => setCountedAmount(e.target.value)}
              placeholder="Cuenta el efectivo y anota el total"
              className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm"
            />
            {countedAmount.trim() !== "" && !Number.isNaN(Number(countedAmount)) && (
              <div
                className={`text-xs mt-2 ${
                  Number(countedAmount) - expected === 0
                    ? "text-muted"
                    : Number(countedAmount) - expected > 0
                    ? "text-brand-600"
                    : "text-red-600"
                }`}
              >
                {Number(countedAmount) - expected === 0
                  ? "Cuadra exacto."
                  : Number(countedAmount) - expected > 0
                  ? `Sobran ${fmtCLP(Number(countedAmount) - expected)}.`
                  : `Faltan ${fmtCLP(Math.abs(Number(countedAmount) - expected))}.`}
              </div>
            )}
            <label className="text-xs text-muted mt-3 block">Notas (opcional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm"
            />
            {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
            <button
              onClick={closeRegister}
              disabled={busy}
              className="w-full mt-4 bg-ink text-white font-semibold py-2.5 rounded-lg disabled:opacity-60"
            >
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
            {history.map((h) => (
              <div key={h.id} className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0 text-sm">
                <div>
                  <div className="font-medium">{h.closed_at ? new Date(h.closed_at).toLocaleString("es-CL") : "—"}</div>
                  <div className="text-xs text-muted">
                    Esperado {fmtCLP(h.expected_amount || 0)} · Contado {fmtCLP(h.counted_amount || 0)}
                  </div>
                </div>
                <div
                  className={`text-sm font-semibold ${
                    !h.difference ? "text-muted" : h.difference > 0 ? "text-brand-600" : "text-red-600"
                  }`}
                >
                  {h.difference === 0 || !h.difference
                    ? "Cuadrado"
                    : h.difference > 0
                    ? `+${fmtCLP(h.difference)}`
                    : fmtCLP(h.difference)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
