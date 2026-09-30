"use client";
import React, { useEffect, useState } from "react";
import { Plus, X, Phone, Mail, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { type Business, type Supplier } from "../lib/types";
import ProGate from "./ProGate";
import OwnerGate from "./OwnerGate";
import { friendlyDbError } from "../lib/plan";

function ProveedoresInner({ business }: { business: Business }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("suppliers").select("*").eq("business_id", business.id).order("name");
    setSuppliers((data as Supplier[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  async function handleDelete(id: string) {
    if (!confirm("¿Eliminar este proveedor?")) return;
    await supabase.from("suppliers").delete().eq("id", id);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Proveedores</h1>
        <button
          onClick={() => {
            setEditing(null);
            setShowForm(true);
          }}
          className="flex items-center gap-1.5 bg-ink text-white text-sm font-medium px-3.5 py-2 rounded-lg"
        >
          <Plus size={16} /> Nuevo proveedor
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-muted py-8 text-center">Cargando…</div>
      ) : suppliers.length === 0 ? (
        <div className="text-sm text-muted py-10 text-center border border-dashed border-line rounded-xl">
          Aún no tienes proveedores registrados.
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {suppliers.map((s) => (
            <div key={s.id} className="bg-white border border-line rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="font-semibold">{s.name}</div>
                  {s.contact && <div className="text-xs text-muted">{s.contact}</div>}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => {
                      setEditing(s);
                      setShowForm(true);
                    }}
                    className="text-xs text-muted hover:text-ink"
                  >
                    Editar
                  </button>
                  <button onClick={() => handleDelete(s.id)} className="text-muted hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
              <div className="space-y-1 text-xs text-muted">
                {s.phone && (
                  <div className="flex items-center gap-1.5">
                    <Phone size={12} /> {s.phone}
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-1.5">
                    <Mail size={12} /> {s.email}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <SupplierForm
          business={business}
          supplier={editing}
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

function SupplierForm({
  business,
  supplier,
  onClose,
  onSaved,
}: {
  business: Business;
  supplier: Supplier | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(supplier?.name || "");
  const [contact, setContact] = useState(supplier?.contact || "");
  const [phone, setPhone] = useState(supplier?.phone || "");
  const [email, setEmail] = useState(supplier?.email || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    if (!name.trim()) {
      setError("El nombre es obligatorio.");
      return;
    }
    setSaving(true);
    setError(null);
    const payload = {
      business_id: business.id,
      name,
      contact: contact || null,
      phone: phone || null,
      email: email || null,
    };
    const { error: err } = supplier
      ? await supabase.from("suppliers").update(payload).eq("id", supplier.id)
      : await supabase.from("suppliers").insert(payload);
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
          <div className="font-bold">{supplier ? "Editar proveedor" : "Nuevo proveedor"}</div>
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
            <label className="block text-xs font-medium text-muted mb-1">Contacto</label>
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
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

export default function Proveedores({ business }: { business: Business }) {
  return (
    <OwnerGate title="Proveedores">
      <ProGate title="Proveedores" description="Registra tus proveedores y sus compras.">
        <ProveedoresInner business={business} />
      </ProGate>
    </OwnerGate>
  );
}
