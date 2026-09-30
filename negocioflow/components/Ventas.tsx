"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Plus, X, Trash2, Search, Pencil, Undo2, Receipt, Loader2, FileDown } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, PAYMENT_METHODS, type Business, type Product, type Sale, type SaleItem, type Customer } from "../lib/types";
import { localISODate, formatDateCL } from "../lib/dates";
import { friendlyDbError } from "../lib/plan";
import { exportSaleReceiptPDF } from "../lib/export";
import { usePlan } from "./PlanContext";

export default function Ventas({ business }: { business: Business }) {
  const { isPro } = usePlan();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [dteBusyId, setDteBusyId] = useState<string | null>(null);
  const [dteMessage, setDteMessage] = useState<{ saleId: string; text: string; ok: boolean } | null>(null);

  async function handleEmitDte(sale: Sale) {
    setDteBusyId(sale.id);
    setDteMessage(null);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const res = await fetch("/api/dte/emit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ saleId: sale.id }),
      });
      const data = await res.json();
      setDteMessage({ saleId: sale.id, text: res.ok ? "Boleta emitida." : data.error, ok: res.ok });
    } catch (err: any) {
      setDteMessage({ saleId: sale.id, text: err.message || "Error inesperado.", ok: false });
    } finally {
      setDteBusyId(null);
    }
  }

  const load = async () => {
    const [salesRes, productsRes, customersRes] = await Promise.all([
      supabase
        .from("sales")
        .select("*, sale_items(*)")
        .eq("business_id", business.id)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase.from("products").select("*").eq("business_id", business.id).order("name"),
      supabase.from("customers").select("*").eq("business_id", business.id).order("name"),
    ]);
    setSales((salesRes.data as Sale[]) || []);
    setProducts((productsRes.data as Product[]) || []);
    setCustomers((customersRes.data as Customer[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((s) => {
      const items = (s.sale_items || []).map((i) => i.product_name.toLowerCase()).join(" ");
      return (
        items.includes(q) ||
        s.payment_method.toLowerCase().includes(q) ||
        formatDateCL(s.sale_date).includes(q) ||
        String(s.total).includes(q)
      );
    });
  }, [sales, query]);

  async function restoreStockForSale(sale: Sale) {
    const items = sale.sale_items || [];
    for (const item of items) {
      if (!item.product_id) continue;
      const product = products.find((p) => p.id === item.product_id);
      if (!product) continue;
      await supabase
        .from("products")
        .update({ stock: Number(product.stock) + Number(item.quantity) })
        .eq("id", item.product_id);
    }
  }

  async function handleVoid(sale: Sale) {
    if (!confirm("¿Anular esta venta? Se devolverá el stock de los productos.")) return;
    setBusyId(sale.id);
    await restoreStockForSale(sale);
    await supabase.from("sales").delete().eq("id", sale.id);
    setBusyId(null);
    load();
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h1 className="text-xl font-bold">Ventas</h1>
        <button
          onClick={() => {
            setEditingSale(null);
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          <Plus size={16} /> Nueva venta
        </button>
      </div>

      {sales.length > 0 && (
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por producto, método de pago o fecha…"
            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-sm"
          />
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted py-8 text-center">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted py-8 text-center">
          {sales.length === 0 ? "Aún no tienes ventas registradas." : "Sin resultados para esa búsqueda."}
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {filtered.map((s) => (
            <div key={s.id} className="px-4 py-3 border-b border-line last:border-0">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm min-w-0">
                  <span className="font-medium">{fmtCLP(s.total)}</span>
                  <span className="text-muted"> · {formatDateCL(s.sale_date)}</span>
                  <span className="text-muted capitalize"> · {s.payment_method}</span>
                  {s.is_demo && <span className="text-violet-600 text-xs font-medium"> · DEMO</span>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-xs text-brand-600 font-medium">+{fmtCLP(s.profit)}</div>
                  <button
                    onClick={() => {
                      setEditingSale(s);
                      setShowModal(true);
                    }}
                    disabled={busyId === s.id}
                    className="text-muted hover:text-ink"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    onClick={() => handleVoid(s)}
                    disabled={busyId === s.id}
                    className="text-muted hover:text-red-600"
                    title="Anular"
                  >
                    <Undo2 size={14} />
                  </button>
                  <button
                    onClick={() => exportSaleReceiptPDF(business, s)}
                    className="text-muted hover:text-ink"
                    title="Comprobante PDF (no es boleta electrónica)"
                  >
                    <FileDown size={14} />
                  </button>
                  {isPro && (
                    <button
                      onClick={() => handleEmitDte(s)}
                      disabled={dteBusyId === s.id}
                      className="text-muted hover:text-ink"
                      title="Emitir boleta electrónica"
                    >
                      {dteBusyId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
                    </button>
                  )}
                </div>
              </div>
              <div className="text-xs text-muted mt-1 truncate">
                {(s.sale_items || []).map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}
              </div>
              {dteMessage && dteMessage.saleId === s.id && (
                <div className={`text-xs mt-1 ${dteMessage.ok ? "text-brand-600" : "text-amber-700"}`}>
                  {dteMessage.text}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <NuevaVentaModal
          business={business}
          products={products}
          customers={customers}
          existingSale={editingSale}
          onClose={() => setShowModal(false)}
          onSaved={() => {
            setShowModal(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function NuevaVentaModal({
  business,
  products,
  customers,
  existingSale,
  onClose,
  onSaved,
}: {
  business: Business;
  products: Product[];
  customers: Customer[];
  existingSale?: Sale | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEditing = !!existingSale;
  const [items, setItems] = useState<SaleItem[]>(existingSale?.sale_items ? [...existingSale.sale_items] : []);
  const [selectedProductId, setSelectedProductId] = useState(products[0]?.id || "");
  const [quantity, setQuantity] = useState("1");
  const [discount, setDiscount] = useState(String(existingSale?.discount ?? 0));
  const [paymentMethod, setPaymentMethod] = useState(existingSale?.payment_method || PAYMENT_METHODS[0]);
  const [customerId, setCustomerId] = useState(existingSale?.customer_id || "");
  const [pendingPayment, setPendingPayment] = useState(existingSale?.pending_payment || false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const addItem = () => {
    const product = products.find((p) => p.id === selectedProductId);
    const qty = Number(quantity);
    if (!product) return setError("Selecciona un producto.");
    if (!Number.isFinite(qty) || qty <= 0) return setError("Cantidad inválida.");
    setError("");
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) => (i.product_id === product.id ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [
        ...prev,
        { product_id: product.id, product_name: product.name, quantity: qty, unit_price: product.sale_price, unit_cost: product.cost },
      ];
    });
    setQuantity("1");
  };

  const removeItem = (productId: string | null) => {
    setItems((prev) => prev.filter((i) => i.product_id !== productId));
  };

  const subtotal = items.reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const discountNum = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountNum);
  const costTotal = items.reduce((s, i) => s + i.unit_cost * i.quantity, 0);
  const profit = total - costTotal;

  const finalize = async () => {
    setError("");
    if (items.length === 0) return setError("Agrega al menos un producto.");
    setSaving(true);

    // Al editar: primero devolvemos el stock de la venta original y la
    // eliminamos, luego creamos la venta nueva. Así el trigger de la base
    // de datos se encarga del stock una sola vez, sin duplicar descuentos.
    if (isEditing && existingSale) {
      for (const item of existingSale.sale_items || []) {
        if (!item.product_id) continue;
        const product = products.find((p) => p.id === item.product_id);
        if (!product) continue;
        await supabase
          .from("products")
          .update({ stock: Number(product.stock) + Number(item.quantity) })
          .eq("id", item.product_id);
      }
      await supabase.from("sales").delete().eq("id", existingSale.id);
    }

    const { data: sale, error: saleError } = await supabase
      .from("sales")
      .insert({
        business_id: business.id,
        sale_date: existingSale?.sale_date || localISODate(),
        payment_method: paymentMethod,
        customer_id: customerId || null,
        pending_payment: customerId ? pendingPayment : false,
        subtotal,
        discount: discountNum,
        total,
        cost_total: costTotal,
        profit,
      })
      .select()
      .single();

    if (saleError || !sale) {
      setSaving(false);
      return setError(friendlyDbError(saleError?.message));
    }

    const { error: itemsError } = await supabase.from("sale_items").insert(
      items.map((i) => ({
        sale_id: sale.id,
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        unit_cost: i.unit_cost,
      }))
    );

    setSaving(false);
    if (itemsError) {
      return setError("Venta creada pero hubo un error al guardar los productos: " + itemsError.message);
    }

    onSaved();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-lg">{isEditing ? "Editar venta" : "Nueva venta"}</div>
          <button onClick={onClose} className="text-muted">
            <X size={20} />
          </button>
        </div>

        {products.length === 0 ? (
          <div className="text-sm text-muted py-6 text-center">
            Primero agrega productos en la sección "Productos" para poder venderlos.
          </div>
        ) : (
          <>
            <div className="flex gap-2 mb-3">
              <select
                value={selectedProductId}
                onChange={(e) => setSelectedProductId(e.target.value)}
                className="flex-1 px-3 py-2 border border-line rounded-lg text-sm"
              >
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} — {fmtCLP(p.sale_price)}
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-20 px-3 py-2 border border-line rounded-lg text-sm"
              />
              <button onClick={addItem} className="bg-brand-500 text-white px-3 rounded-lg">
                <Plus size={18} />
              </button>
            </div>

            {items.length > 0 && (
              <div className="border border-line rounded-lg divide-y divide-line mb-4">
                {items.map((i) => (
                  <div key={i.product_id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span>
                      {i.quantity} × {i.product_name}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{fmtCLP(i.unit_price * i.quantity)}</span>
                      <button onClick={() => removeItem(i.product_id)} className="text-muted hover:text-red-600">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-muted">Descuento</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted">Método de pago</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </div>
            </div>

            {customers.length > 0 && (
              <div className="mb-4">
                <label className="text-xs text-muted">Cliente (opcional)</label>
                <select
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm"
                >
                  <option value="">Sin cliente</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                {customerId && (
                  <label className="flex items-center gap-2 mt-2 text-sm text-muted">
                    <input
                      type="checkbox"
                      checked={pendingPayment}
                      onChange={(e) => setPendingPayment(e.target.checked)}
                    />
                    Venta al fiado (pago pendiente)
                  </label>
                )}
              </div>
            )}

            <div className="bg-surface rounded-lg p-3 text-sm space-y-1 mb-4">
              <div className="flex justify-between"><span className="text-muted">Subtotal</span><span>{fmtCLP(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted">Descuento</span><span>-{fmtCLP(discountNum)}</span></div>
              <div className="flex justify-between font-bold text-base"><span>Total</span><span>{fmtCLP(total)}</span></div>
            </div>

            {error && <div className="text-sm text-red-600 mb-3">{error}</div>}

            <button
              onClick={finalize}
              disabled={saving}
              className="w-full bg-brand-500 text-white font-semibold py-3 rounded-lg disabled:opacity-60"
            >
              {saving ? "Guardando…" : isEditing ? `Guardar cambios — ${fmtCLP(total)}` : `Registrar venta — ${fmtCLP(total)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
