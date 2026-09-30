"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Plus, X, Trash2, Pencil, Search } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, EXPENSE_CATEGORIES, PAYMENT_METHODS, type Business, type Expense } from "../lib/types";
import { localISODate, formatDateCL } from "../lib/dates";
import { friendlyDbError } from "../lib/plan";
import OwnerGate from "./OwnerGate";

const EMPTY_FORM = {
  description: "",
  category: EXPENSE_CATEGORIES[0],
  amount: "",
  expense_date: localISODate(),
  payment_method: PAYMENT_METHODS[0],
  note: "",
};

function GastosInner({ business }: { business: Business }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    const { data } = await supabase
      .from("expenses")
      .select("*")
      .eq("business_id", business.id)
      .order("expense_date", { ascending: false });
    setExpenses((data as Expense[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return expenses;
    return expenses.filter(
      (e) =>
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        formatDateCL(e.expense_date).includes(q)
    );
  }, [expenses, query]);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(e: Expense) {
    setEditingId(e.id);
    setForm({
      description: e.description,
      category: e.category,
      amount: String(e.amount),
      expense_date: e.expense_date,
      payment_method: e.payment_method,
      note: e.note || "",
    });
    setError("");
    setShowForm(true);
  }

  const saveExpense = async () => {
    setError("");
    if (!form.description.trim()) return setError("Ingresa una descripción.");
    const amount = Number(form.amount);
    if (!Number.isFinite(amount) || amount <= 0) return setError("Ingresa un monto válido.");

    const payload = {
      business_id: business.id,
      description: form.description.trim(),
      category: form.category,
      amount,
      expense_date: form.expense_date,
      payment_method: form.payment_method,
      note: form.note.trim() || null,
    };

    const { error: err } = editingId
      ? await supabase.from("expenses").update(payload).eq("id", editingId)
      : await supabase.from("expenses").insert(payload);

    if (err) return setError(friendlyDbError(err.message));

    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    load();
  };

  const removeExpense = async (id: string) => {
    if (!confirm("¿Eliminar este gasto?")) return;
    setExpenses((prev) => prev.filter((e) => e.id !== id));
    await supabase.from("expenses").delete().eq("id", id);
  };

  const total = filtered.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Gastos</h1>
        <button
          onClick={() => (showForm ? setShowForm(false) : openNew())}
          className="flex items-center gap-1.5 bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cerrar" : "Nuevo gasto"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-line rounded-xl p-5 mb-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Descripción">
              <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Categoría">
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputCls}>
                {EXPENSE_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Monto">
              <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Fecha">
              <input type="date" value={form.expense_date} onChange={(e) => setForm({ ...form, expense_date: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Método de pago">
              <select value={form.payment_method} onChange={(e) => setForm({ ...form, payment_method: e.target.value })} className={inputCls}>
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Nota (opcional)">
              <input value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
          <button onClick={saveExpense} className="mt-4 bg-brand-500 text-white text-sm font-semibold px-5 py-2 rounded-lg">
            {editingId ? "Guardar cambios" : "Guardar gasto"}
          </button>
        </div>
      )}

      {expenses.length > 0 && (
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por descripción, categoría o fecha…"
            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-sm"
          />
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted py-8 text-center">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted py-8 text-center">
          {expenses.length === 0 ? "Aún no tienes gastos registrados." : "Sin resultados para esa búsqueda."}
        </div>
      ) : (
        <>
          <div className="text-sm text-muted mb-3">
            Total: <strong className="text-ink">{fmtCLP(total)}</strong>
          </div>
          <div className="bg-white border border-line rounded-xl overflow-hidden">
            {filtered.map((e) => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {e.description}
                    {e.is_demo && <span className="text-violet-600 text-xs font-medium"> · DEMO</span>}
                  </div>
                  <div className="text-xs text-muted mt-0.5 capitalize">
                    {e.category} · {formatDateCL(e.expense_date)} · {e.payment_method}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-sm font-semibold">{fmtCLP(e.amount)}</div>
                  <button onClick={() => openEdit(e)} className="text-muted hover:text-ink">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => removeExpense(e.id)} className="text-muted hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

export default function Gastos({ business }: { business: Business }) {
  return (
    <OwnerGate title="Gastos">
      <GastosInner business={business} />
    </OwnerGate>
  );
}
