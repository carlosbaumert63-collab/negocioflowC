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

  async function load() {
    setLoading(true);
    const { data: custs } = await supabase
      .from("customers")
      .select("*")
      .eq("business_id", business.id)
      .order("name");

    const { data: sales } = await supabase
      .from("sales")
      .select("id, customer_id, total, sale_date, pending_payment")
      .eq("business_id", business.id)
      .not("customer_id", "is", null);

    const statsByCustomer = new Map<
      string,
      { count: number; total: number; last: string | null; pending: number; pendingSince: string | null }
    >();
    (sales || []).forEach((s: any) => {
      const cur = statsByCustomer.get(s.customer_id) || {
        count: 0,
        total: 0,
        last: null,
        pending: 0,
        pendingSince: null,
      };
      cur.count += 1;
      cur.total += Number(s.total);
      if (!cur.last || s.sale_date > cur.last) cur.last = s.sale_date;
      if (s.pending_payment) {
        cur.pending += Number(s.total);
        if (!cur.pendingSince || s.sale_date < cur.pendingSince) cur.pendingSince = s.sale_date;
      }
      statsByCustomer.set(s.customer_id, cur);
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
    );
    setLoading(false);
  }

  async function markCustomerPaid(customerId: string) {
    await supabase
      .from("sales")
      .update({ pending_payment: false })
      .eq("business_id", business.id)
      .eq("customer_id", customerId)
      .eq("pending_payment", true);
    load();
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este cliente?")) return;
    await supabase.from("customers").delete().eq("id", id);
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
                  <button onClick={() => handleDelete(c.id)} className="text-muted hover:text-red-600">
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
                      onClick={() => markCustomerPaid(c.id)}
                      className="flex items-center gap-1 text-xs font-medium text-amber-700 underline"
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

  async function handleSave() {
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = { business_id: business.id, name, phone: phone || null, email: email || null, notes: notes || null };
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
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold">{customer ? "Editar cliente" : "Nuevo cliente"}</div>
          <button onClick={onClose}>
            <X size={18} className="text-muted" />
          </button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Nombre</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Teléfono</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Notas</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm"
              rows={2}
            />
          </div>
        </div>
        {error && <div className="text-xs text-red-600 mt-3">{error}</div>}
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium mt-4 disabled:opacity-60"
        >
          Guardar
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
