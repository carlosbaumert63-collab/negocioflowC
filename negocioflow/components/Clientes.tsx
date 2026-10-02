"use client";
import React, { useEffect, useState } from "react";
import { Plus, X, Phone, Mail, Trash2, AlertCircle, Check, MessageCircle } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Business, type Customer } from "../lib/types";
import { formatDateCL, localISODate } from "../lib/dates";
import ProGate from "./ProGate";
import OwnerGate from "./OwnerGate";
import { usePlan } from "./PlanContext";
import { friendlyDbError } from "../lib/plan";
import { useEscape } from "../lib/useEscape";

interface CustomerStats extends Customer {
  purchaseCount: number;
  totalSpent: number;
  lastPurchase: string | null;
  pendingAmount: number;
  pendingSince: string | null;
}

function daysSince(iso: string): number {
  const ms = new Date(localISODate()).getTime() - new Date(iso).getTime();
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

// Arma un link de WhatsApp (wa.me) con el mensaje ya escrito. No usa ninguna
// API paga: simplemente abre WhatsApp Web o la app con el texto listo.
function whatsAppLink(phone: string, message: string): string {
  let digits = phone.replace(/\D/g, "");
  if (!digits.startsWith("56")) {
    digits = digits.startsWith("0") ? "56" + digits.slice(1) : "56" + digits;
  }
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

function ClientesInner({ business }: { business: Business }) {
  const [customers, setCustomers] = useState<CustomerStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Customer | null>(null);
  const [listError, setListError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    const { data: custs } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", business.id)
      .order("name");

    // Las estadísticas se calculan en la base de datos (sin tope de filas).
    const { data: stats, error: statsErr } = await supabase.rpc("customer_stats", { p_business_id: business.id });
    if (statsErr) setListError(friendlyDbError(statsErr.message));

    const statsByCustomer = new Map<
      string,
      { count: number; total: number; last: string | null; pending: number; pendingSince: string | null }
    >();
    ((stats as any[]) || []).forEach((r: any) => {
      statsByCustomer.set(r.customer_id, {
        count: Number(r.purchase_count || 0),
        total: Number(r.total_spent || 0),
        last: r.last_purchase || null,
        pending: Number(r.pending_amount || 0),
        pendingSince: r.pending_since || null,
      });
    });

    setCustomers(
      (custs || []).map((c: any) => {
        const st = statsByCustomer.get(c.id) || {
          count: 0,
          total: 0,
          last: null,
          pending: 0,
          pendingSince: null,
        };
        return {
          ...c,
          purchaseCount: st.count,
          totalSpent: st.total,
          lastPurchase: st.last,
          pendingAmount: st.pending,
          pendingSince: st.pendingSince,
        };
      })
      // Primero quienes te deben (más antiguo primero), luego el resto por nombre.
      .sort((a: CustomerStats, b: CustomerStats) => {
        if ((a.pendingAmount > 0) !== (b.pendingAmount > 0)) return a.pendingAmount > 0 ? -1 : 1;
        if (a.pendingSince && b.pendingSince) return a.pendingSince.localeCompare(b.pendingSince);
        return a.name.localeCompare(b.name, "es");
      })
    );
    setLoading(false);
  }

  async function markCustomerPaid(c: CustomerStats) {
    if (!confirm(`¿Marcar como pagada toda la deuda de ${c.name} (${fmtCLP(c.pendingAmount)})?`)) return;
    setBusyId(c.id);
    setListError("");
    // Al marcarse pagadas, la base de datos registra el momento del pago, así
    // ese efectivo entra en la caja del turno actual.
    const { error } = await supabase
      .from("sales")
      .update({ pending_payment: false })
      .eq("business_id", business.id)
      .eq("customer_id", c.id)
      .eq("pending_payment", true);
    setBusyId(null);
    if (error) return setListError(friendlyDbError(error.message));
    load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  async function handleDelete(c: CustomerStats) {
    if (c.pendingAmount > 0) {
      setListError(`${c.name} todavía te debe ${fmtCLP(c.pendingAmount)}. Márcalo como pagado antes de eliminarlo.`);
      return;
    }
    if (!confirm(`¿Eliminar a ${c.name}? Sus compras anteriores se mantienen en tu historial, sin el nombre del cliente.`)) return;
    setListError("");
    const { error } = await supabase.from("customers").delete().eq("id", c.id);
    if (error) return setListError(friendlyDbError(error.message));
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Clientes</h1>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 bg-ink text-white text-sm font-medium px-3.5 py-2 rounded-lg"
        >
          <Plus size={16} /> Nuevo cliente
        </button>
      </div>

      {listError && <div role="alert" className="text-sm text-red-600 mb-3">{listError}</div>}

      {loading ? (
        <div className="text-sm text-muted py-8 text-center">Cargando…</div>
      ) : customers.length === 0 ? (
        <div className="text-sm text-muted py-10 text-center border border-dashed border-line rounded-xl">
          Aún no tienes clientes registrados. Registrar clientes es opcional para vender.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {customers.map((c) => (
            <div key={c.id} className="bg-white border border-line rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className="font-semibold">{c.name}</div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditing(c);
                      setShowForm(true);
                    }}
                    className="text-xs text-muted hover:text-ink"
                  >
                    Editar
                  </button>
                  <button onClick={() => handleDelete(c)} className="text-muted hover:text-red-600" aria-label={`Eliminar ${c.name}`}>
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted mb-3">
                {c.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} /> {c.phone}
                  </div>
                )}
                {c.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail size={12} /> {c.email}
                  </div>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2 text-center border-t border-line pt-3">
                <div>
                  <div className="text-sm font-bold">{c.purchaseCount}</div>
                  <div className="text-[10px] text-muted">Compras</div>
                </div>
                <div>
                  <div className="text-sm font-bold">{fmtCLP(c.totalSpent)}</div>
                  <div className="text-[10px] text-muted">Gastado</div>
                </div>
                <div>
                  <div className="text-sm font-bold">{c.lastPurchase ? formatDateCL(c.lastPurchase) : "—"}</div>
                  <div className="text-[10px] text-muted">Última compra</div>
                </div>
              </div>

              {c.pendingAmount > 0 && (
                <div className="flex items-center justify-between gap-2 mt-3 pt-3 border-t border-amber-100 bg-amber-50 -mx-4 -mb-4 px-4 py-2.5 rounded-b-xl">
                  <div className="flex items-center gap-1.5 text-xs text-amber-700">
                    <AlertCircle size={13} className="flex-shrink-0" />
                    Te debe <strong>{fmtCLP(c.pendingAmount)}</strong>
                    {c.pendingSince && ` hace ${daysSince(c.pendingSince)} día(s)`}
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {c.phone && (
                      <a
                        href={whatsAppLink(
                          c.phone,
                          `Hola ${c.name}, te escribo de ${business.name} para recordarte que tienes un saldo pendiente de ${fmtCLP(
                            c.pendingAmount
                          )}. ¡Gracias!`
                        )}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 text-xs font-medium text-amber-700 underline"
                        title="Recordar por WhatsApp"
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    )}
                    <button
                      onClick={() => markCustomerPaid(c)}
                      disabled={busyId === c.id}
                      className="flex items-center gap-1 text-xs font-medium text-amber-700 underline disabled:opacity-60"
                    >
                      <Check size={12} /> Marcar pagado
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <CustomerForm
          business={business}
          customer={editing}
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function CustomerForm({
  business,
  customer,
  onClose,
  onSaved,
}: {
  business: Business;
  customer: Customer | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(customer?.name || "");
  const [phone, setPhone] = useState(customer?.phone || "");
  const [email, setEmail] = useState(customer?.email || "");
  const [notes, setNotes] = useState(customer?.notes || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscape(onClose, !saving);

  async function handleSave() {
    if (saving) return;
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      business_id: business.id,
      name: name.trim(),
      phone: phone.trim() || null,
      email: email.trim() || null,
      notes: notes.trim() || null,
    };
    const { error: err } = customer
      ? await supabase.from("customers").update(payload).eq("id", customer.id)
      : await supabase.from("customers").insert(payload);
    setSaving(false);
    if (err) {
      setError(friendlyDbError(err.message));
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={customer ? "Editar cliente" : "Nuevo cliente"}
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold">{customer ? "Editar cliente" : "Nuevo cliente"}</div>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={18} className="text-muted" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1" htmlFor="cli-nombre">Nombre</label>
            <input
              id="cli-nombre"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1" htmlFor="cli-tel">Teléfono (para cobrar por WhatsApp)</label>
            <input
              id="cli-tel"
              type="tel"
              inputMode="tel"
              placeholder="Ej. 9 1234 5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1" htmlFor="cli-email">Email</label>
            <input
              id="cli-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1" htmlFor="cli-notas">Notas</label>
            <textarea
              id="cli-notas"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm"
              rows={2}
            />
          </div>
        </div>
        {error && <div role="alert" className="text-xs text-red-600 mt-3">{error}</div>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium mt-4 disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </div>
  );
}

export default function Clientes({ business }: { business: Business }) {
  usePlan();
  return (
    <OwnerGate title="Clientes">
      <ProGate title="Clientes" description="Registra tus clientes y sigue cuánto te compran.">
        <ClientesInner business={business} />
      </ProGate>
    </OwnerGate>
  );
}
