"use client";
import React, { useEffect, useState } from "react";
import { Plus, X, Trash2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Business, type Supplier, type Product } from "../lib/types";
import { formatDateCL, localISODate } from "../lib/dates";
import ProGate from "./ProGate";
import OwnerGate from "./OwnerGate";
import { friendlyDbError } from "../lib/plan";
import { useEscape } from "../lib/useEscape";

interface PurchaseRow {
  id: string;
  purchase_date: string;
  total: number;
  supplier_id: string | null;
  supplierName: string;
  itemCount: number;
}

function ComprasInner({ business }: { business: Business }) {
  const [purchases, setPurchases] = useState<PurchaseRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);

  async function load() {
    setLoading(true);
    // El conteo de ítems viene embebido por compra (sin traer todos los ítems).
    const [{ data: purch }, { data: suppliers }] = await Promise.all([
      supabase
        .from("purchases")
        .select("*, purchase_items(count)")
        .eq("business_id", business.id)
        .order("purchase_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(300),
      supabase.from("suppliers").select("id, name").eq("business_id", business.id),
    ]);
    const supplierMap = new Map((suppliers || []).map((s: any) => [s.id, s.name]));

    setPurchases(
      (purch || []).map((p: any) => ({
        id: p.id,
        purchase_date: p.purchase_date,
        total: Number(p.total),
        supplier_id: p.supplier_id,
        supplierName: p.supplier_id ? supplierMap.get(p.supplier_id) || "—" : "Sin proveedor",
        itemCount: Number(p.purchase_items?.[0]?.count || 0),
      }))
    );
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Compras</h1>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 bg-ink text-white text-sm font-medium px-3.5 py-2 rounded-lg"
        >
          <Plus size={16} /> Nueva compra
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-muted py-8 text-center">Cargando…</div>
      ) : purchases.length === 0 ? (
        <div className="text-sm text-muted py-10 text-center border border-dashed border-line rounded-xl">
          Aún no registras compras a proveedores.
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface text-xs text-muted">
              <tr>
                <th className="text-left px-4 py-2.5 font-medium">Fecha</th>
                <th className="text-left px-4 py-2.5 font-medium">Proveedor</th>
                <th className="text-left px-4 py-2.5 font-medium">Productos</th>
                <th className="text-right px-4 py-2.5 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((p) => (
                <tr key={p.id} className="border-t border-line">
                  <td className="px-4 py-2.5">{formatDateCL(p.purchase_date)}</td>
                  <td className="px-4 py-2.5">{p.supplierName}</td>
                  <td className="px-4 py-2.5 text-muted">{p.itemCount} ítem(s)</td>
                  <td className="px-4 py-2.5 text-right font-medium">{fmtCLP(p.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <NuevaCompraModal
          business={business}
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

interface ItemRow {
  product_id: string;
  quantity: string;
  unit_cost: string;
}

function NuevaCompraModal({
  business,
  onClose,
  onSaved,
}: {
  business: Business;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [supplierId, setSupplierId] = useState<string>("");
  const [date, setDate] = useState(localISODate());
  const [items, setItems] = useState<ItemRow[]>([{ product_id: "", quantity: "1", unit_cost: "0" }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEscape(onClose, !saving);

  useEffect(() => {
    supabase
      .from("suppliers")
      .select("*")
      .eq("business_id", business.id)
      .order("name")
      .then(({ data }) => setSuppliers((data as Supplier[]) || []));
    supabase
      .from("products")
      .select("*")
      .eq("business_id", business.id)
      .order("name")
      .then(({ data }) => setProducts((data as Product[]) || []));
  }, [business.id]);

  function updateItem(i: number, patch: Partial<ItemRow>) {
    setItems((prev) => prev.map((row, idx) => (idx === i ? { ...row, ...patch } : row)));
  }

  function addItem() {
    setItems((prev) => [...prev, { product_id: "", quantity: "1", unit_cost: "0" }]);
  }

  function removeItem(i: number) {
    setItems((prev) => prev.filter((_, idx) => idx !== i));
  }

  // El total se calcula solo con las filas que realmente se van a guardar.
  const validItems = items.filter((it) => it.product_id && Number(it.quantity) > 0);
  const total = Math.round(
    validItems.reduce((s, it) => s + (Number(it.quantity) || 0) * (Number(it.unit_cost) || 0), 0)
  );
  const ignoredRows = items.length - validItems.length;

  async function handleSave() {
    if (saving) return;
    if (validItems.length === 0) {
      setError("Agrega al menos un producto con cantidad válida.");
      return;
    }
    if (validItems.some((it) => !Number.isFinite(Number(it.unit_cost)) || Number(it.unit_cost) < 0)) {
      setError("Hay un costo inválido (no puede ser negativo).");
      return;
    }
    setSaving(true);
    setError(null);
    // Cabecera + ítems en una sola transacción: si algo falla, no queda una
    // compra a medias ni stock sumado sin su compra.
    const { error: rpcErr } = await supabase.rpc("save_purchase", {
      p_business_id: business.id,
      p_supplier_id: supplierId || null,
      p_purchase_date: date,
      p_items: validItems.map((it) => ({
        product_id: it.product_id,
        quantity: Number(it.quantity),
        unit_cost: Math.round(Number(it.unit_cost) || 0),
      })),
    });
    setSaving(false);
    if (rpcErr) {
      setError(friendlyDbError(rpcErr.message));
      return;
    }
    onSaved();
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Nueva compra"
        className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg p-5 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold">Nueva compra</div>
          <button onClick={onClose} aria-label="Cerrar">
            <X size={18} className="text-muted" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1" htmlFor="compra-prov">Proveedor</label>
            <select
              id="compra-prov"
              value={supplierId}
              onChange={(e) => setSupplierId(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm"
            >
              <option value="">Sin proveedor</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted mb-1" htmlFor="compra-fecha">Fecha</label>
            <input
              id="compra-fecha"
              type="date"
              value={date}
              max={localISODate()}
              onChange={(e) => setDate(e.target.value)}
              className="w-full border border-line rounded-lg px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="space-y-2 mb-3">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2 items-center">
              <select
                value={it.product_id}
                onChange={(e) => {
                  const p = products.find((pr) => pr.id === e.target.value);
                  updateItem(i, { product_id: e.target.value, unit_cost: p ? String(p.cost) : it.unit_cost });
                }}
                className="flex-1 border border-line rounded-lg px-2 py-2 text-sm min-w-0"
                aria-label="Producto"
              >
                <option value="">Producto…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min={1}
                value={it.quantity}
                aria-label="Cantidad"
                onChange={(e) => updateItem(i, { quantity: e.target.value })}
                className="w-16 border border-line rounded-lg px-2 py-2 text-sm"
                placeholder="Cant."
              />
              <input
                type="number"
                min={0}
                inputMode="numeric"
                aria-label="Costo unitario"
                value={it.unit_cost}
                onChange={(e) => updateItem(i, { unit_cost: e.target.value })}
                className="w-24 border border-line rounded-lg px-2 py-2 text-sm"
                placeholder="Costo u."
              />
              <button onClick={() => removeItem(i)} className="text-muted hover:text-red-600 flex-shrink-0" aria-label="Quitar fila">
                <Trash2 size={16} />
              </button>
            </div>
          ))}
          <button onClick={addItem} className="text-xs text-brand-700 font-medium">
            + Agregar producto
          </button>
        </div>

        <div className="flex items-center justify-between border-t border-line pt-3 mb-3">
          <span className="text-sm text-muted">Total</span>
          <span className="text-lg font-bold">{fmtCLP(total)}</span>
        </div>
        {ignoredRows > 0 && (
          <div className="text-xs text-muted mb-3">
            {ignoredRows} fila(s) sin producto o sin cantidad no se guardarán.
          </div>
        )}

        {error && <div role="alert" className="text-xs text-red-600 mb-3">{error}</div>}

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-ink text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {saving ? "Guardando…" : "Registrar compra"}
        </button>
      </div>
    </div>
  );
}

export default function Compras({ business }: { business: Business }) {
  return (
    <OwnerGate title="Compras">
      <ProGate title="Compras" description="Registra compras a proveedores: aumentan tu stock y costo automáticamente.">
        <ComprasInner business={business} />
      </ProGate>
    </OwnerGate>
  );
}
