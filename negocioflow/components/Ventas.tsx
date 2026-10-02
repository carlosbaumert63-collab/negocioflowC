"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, X, Trash2, Search, Pencil, Undo2, Receipt, Loader2, FileDown } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, PAYMENT_METHODS, type Business, type Product, type Sale, type SaleItem, type Customer } from "../lib/types";
import { localISODate, formatDateCL } from "../lib/dates";
import { friendlyDbError } from "../lib/plan";
import { exportSaleReceiptPDF } from "../lib/export";
import { usePlan } from "./PlanContext";

const PAGE_SIZE = 50;

export default function Ventas({ business }: { business: Business }) {
  const { isPro, isOwner } = usePlan();
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingSale, setEditingSale] = useState<Sale | null>(null);
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [listError, setListError] = useState("");
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
        body: JSON.stringify({ saleId: sale.id, businessId: business.id }),
      });
      const data = await res.json();
      setDteMessage({ saleId: sale.id, text: res.ok ? data.warning || "Boleta emitida." : data.error, ok: res.ok && !data.warning });
    } catch (err: any) {
      setDteMessage({ saleId: sale.id, text: friendlyDbError(err.message), ok: false });
    } finally {
      setDteBusyId(null);
    }
  }

  function salesQuery(from: number) {
    return supabase
      .from("sales")
      .select("*, sale_items(*)")
      .eq("business_id", business.id)
      .order("sale_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
  }

  const load = async () => {
    const [salesRes, productsRes, customersRes] = await Promise.all([
      salesQuery(0),
      supabase.from("products").select("*").eq("business_id", business.id).order("name"),
      supabase.from("customers").select("*").eq("business_id", business.id).order("name"),
    ]);
    setListError(salesRes.error ? friendlyDbError(salesRes.error.message) : "");
    const list = (salesRes.data as Sale[]) || [];
    setSales(list);
    setHasMore(list.length === PAGE_SIZE);
    setProducts((productsRes.data as Product[]) || []);
    setCustomers((customersRes.data as Customer[]) || []);
    setLoading(false);
  };

  async function loadMore() {
    setLoadingMore(true);
    const { data, error } = await salesQuery(sales.length);
    setLoadingMore(false);
    if (error) return setListError(friendlyDbError(error.message));
    const more = (data as Sale[]) || [];
    setSales((prev) => [...prev, ...more.filter((m) => !prev.some((p) => p.id === m.id))]);
    setHasMore(more.length === PAGE_SIZE);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  const customerName = useMemo(() => {
    const map = new Map(customers.map((c) => [c.id, c.name]));
    return (id: string | null) => (id ? map.get(id) || null : null);
  }, [customers]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((s) => {
      const items = (s.sale_items || []).map((i) => i.product_name.toLowerCase()).join(" ");
      return (
        items.includes(q) ||
        s.payment_method.toLowerCase().includes(q) ||
        formatDateCL(s.sale_date).includes(q) ||
        String(s.total).includes(q) ||
        (customerName(s.customer_id) || "").toLowerCase().includes(q)
      );
    });
  }, [sales, query, customerName]);

  async function handleVoid(sale: Sale) {
    if (!confirm("¿Anular esta venta? Se devolverá el stock de los productos.")) return;
    setBusyId(sale.id);
    setListError("");
    // Anular y devolver stock ocurre en una sola transacción en la base de datos.
    const { error } = await supabase.rpc("void_sale", { p_sale_id: sale.id });
    setBusyId(null);
    if (error) return setListError(friendlyDbError(error.message));
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
            placeholder="Buscar por producto, cliente, método de pago o fecha…"
            aria-label="Buscar ventas"
            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-sm"
          />
        </div>
      )}

      {listError && <div className="text-sm text-red-600 mb-3">{listError}</div>}

      {loading ? (
        <div className="text-sm text-muted py-8 text-center">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted py-8 text-center">
          {sales.length === 0 ? "Aún no tienes ventas registradas." : "Sin resultados para esa búsqueda."}
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {filtered.map((s) => {
            const cName = customerName(s.customer_id);
            return (
              <div key={s.id} className="px-4 py-3 border-b border-line last:border-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-sm min-w-0">
                    <span className="font-medium">{fmtCLP(s.total)}</span>
                    <span className="text-muted"> · {formatDateCL(s.sale_date)}</span>
                    <span className="text-muted capitalize"> · {s.payment_method}</span>
                    {s.pending_payment && <span className="text-amber-700 text-xs font-medium"> · FIADO</span>}
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
                      aria-label="Editar venta"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleVoid(s)}
                      disabled={busyId === s.id}
                      className="text-muted hover:text-red-600"
                      title="Anular"
                      aria-label="Anular venta"
                    >
                      {busyId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Undo2 size={14} />}
                    </button>
                    <button
                      onClick={() => exportSaleReceiptPDF(business, s)}
                      className="text-muted hover:text-ink"
                      title="Comprobante PDF (no es boleta electrónica)"
                      aria-label="Descargar comprobante"
                    >
                      <FileDown size={14} />
                    </button>
                    {isPro && isOwner && (
                      <button
                        onClick={() => handleEmitDte(s)}
                        disabled={dteBusyId === s.id}
                        className="text-muted hover:text-ink"
                        title="Emitir boleta electrónica"
                        aria-label="Emitir boleta electrónica"
                      >
                        {dteBusyId === s.id ? <Loader2 size={14} className="animate-spin" /> : <Receipt size={14} />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-xs text-muted mt-1 truncate">
                  {cName && <span className="text-ink">{cName} · </span>}
                  {(s.sale_items || []).map((i) => `${i.quantity}× ${i.product_name}`).join(", ")}
                </div>
                {dteMessage && dteMessage.saleId === s.id && (
                  <div className={`text-xs mt-1 ${dteMessage.ok ? "text-brand-600" : "text-amber-700"}`}>
                    {dteMessage.text}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {hasMore && !query && (
        <button
          onClick={loadMore}
          disabled={loadingMore}
          className="w-full mt-3 py-2.5 text-sm text-muted border border-line rounded-lg bg-white disabled:opacity-60"
        >
          {loadingMore ? "Cargando…" : "Cargar ventas anteriores"}
        </button>
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
  const [items, setItems] = useState<SaleItem[]>(
    existingSale?.sale_items ? existingSale.sale_items.map((i) => ({ ...i, quantity: Number(i.quantity) })) : []
  );
  const [search, setSearch] = useState("");
  const [discount, setDiscount] = useState(String(existingSale?.discount ? Number(existingSale.discount) : ""));
  const [paymentMethod, setPaymentMethod] = useState(existingSale?.payment_method || business.main_sale_method || PAYMENT_METHODS[0]);
  const [customerId, setCustomerId] = useState(existingSale?.customer_id || "");
  const [pendingPayment, setPendingPayment] = useState(existingSale?.pending_payment || false);
  const [saleDate, setSaleDate] = useState(existingSale?.sale_date || localISODate());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // Cerrar con Escape (si no se está guardando).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            (p.sku || "").toLowerCase().includes(q) ||
            (p.category || "").toLowerCase().includes(q)
        )
      : products;
    return list.slice(0, 30);
  }, [products, search]);

  // Stock disponible considerando lo que ya tenía esta venta (al editar).
  function availableStock(productId: string): number | null {
    const product = products.find((p) => p.id === productId);
    if (!product || !business.has_inventory) return null;
    const original = (existingSale?.sale_items || [])
      .filter((i) => i.product_id === productId)
      .reduce((s, i) => s + Number(i.quantity), 0);
    return Number(product.stock) + original;
  }

  function addProduct(product: Product) {
    setError("");
    setItems((prev) => {
      const existing = prev.find((i) => i.product_id === product.id);
      if (existing) {
        return prev.map((i) => (i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
      }
      return [
        ...prev,
        {
          product_id: product.id,
          product_name: product.name,
          quantity: 1,
          unit_price: Number(product.sale_price),
          unit_cost: Number(product.cost),
        },
      ];
    });
    setSearch("");
    searchRef.current?.focus();
  }

  // Con los botones +/− y el basurero, una cantidad 0 quita el producto. Al
  // escribir en el campo NO se quita (si no, borrar el número para escribir
  // otro haría desaparecer la línea); se valida al guardar.
  // Se identifica la línea por su posición: varias líneas pueden no tener
  // product_id (productos eliminados después de la venta).
  function setQty(index: number, value: number, removeIfZero = true) {
    const qty = Number.isFinite(value) ? Math.max(0, Math.round(value * 1000) / 1000) : 0;
    setItems((prev) =>
      prev
        .map((i, idx) => (idx === index ? { ...i, quantity: qty } : i))
        .filter((i, idx) => !removeIfZero || idx !== index || i.quantity > 0)
    );
  }

  const subtotal = Math.round(items.reduce((s, i) => s + i.unit_price * i.quantity, 0));
  const discountRaw = Math.round(Number(discount) || 0);
  const discountNum = Math.min(Math.max(discountRaw, 0), subtotal);
  const total = subtotal - discountNum;
  const today = localISODate();

  const finalize = async () => {
    if (saving) return;
    setError("");
    if (items.length === 0) return setError("Agrega al menos un producto.");
    if (items.some((i) => !Number.isFinite(i.quantity) || i.quantity <= 0))
      return setError("Hay un producto con cantidad 0. Corrígela o quítalo de la venta.");
    if (discountRaw < 0) return setError("El descuento no puede ser negativo.");
    if (saleDate > today) return setError("La fecha de la venta no puede ser futura.");
    setSaving(true);

    // Todo ocurre en una sola transacción en la base de datos: se calcula el
    // total, se ajusta el stock y, si es una edición, se anula la versión
    // anterior. Si algo falla, no queda nada a medias.
    const { error: rpcError } = await supabase.rpc("save_sale", {
      p_business_id: business.id,
      p_sale_id: existingSale?.id ?? null,
      p_payment_method: paymentMethod,
      p_customer_id: customerId || null,
      p_pending: customerId ? pendingPayment : false,
      p_discount: discountNum,
      p_items: items.map((i) => ({
        product_id: i.product_id,
        product_name: i.product_name,
        quantity: i.quantity,
        unit_price: i.unit_price,
        unit_cost: i.unit_cost,
      })),
      p_sale_date: saleDate,
    });

    setSaving(false);
    if (rpcError) return setError(friendlyDbError(rpcError.message));
    onSaved();
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      onClick={() => !saving && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar venta" : "Nueva venta"}
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="font-bold text-lg">{isEditing ? "Editar venta" : "Nueva venta"}</div>
          <button onClick={onClose} className="text-muted" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>

        {products.length === 0 && items.length === 0 ? (
          <div className="text-sm text-muted py-6 text-center">
            Primero agrega productos en la sección "Productos" para poder venderlos.
          </div>
        ) : (
          <>
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                ref={searchRef}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && matches.length > 0 && search.trim()) {
                    e.preventDefault();
                    addProduct(matches[0]);
                  }
                }}
                placeholder="Buscar producto por nombre, código o categoría…"
                aria-label="Buscar producto"
                autoFocus={!isEditing}
                className="w-full pl-9 pr-3 py-2.5 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>

            <div className="border border-line rounded-lg max-h-44 overflow-y-auto mb-4 divide-y divide-line">
              {matches.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted">No hay productos que coincidan.</div>
              ) : (
                matches.map((p) => {
                  const out = business.has_inventory && Number(p.stock) <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-surface"
                    >
                      <span className="min-w-0 truncate">
                        {p.name}
                        {business.has_inventory && (
                          <span className={`text-xs ml-1.5 ${out ? "text-red-600" : "text-muted"}`}>
                            {out ? "agotado" : `stock ${Number(p.stock)}`}
                          </span>
                        )}
                      </span>
                      <span className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-medium">{fmtCLP(p.sale_price)}</span>
                        <Plus size={14} className="text-brand-600" />
                      </span>
                    </button>
                  );
                })
              )}
            </div>

            {items.length > 0 && (
              <div className="border border-line rounded-lg divide-y divide-line mb-4">
                {items.map((i, idx) => {
                  const avail = i.product_id ? availableStock(i.product_id) : null;
                  const short = avail !== null && i.quantity > avail;
                  return (
                    <div key={i.product_id || `linea-${idx}`} className="px-3 py-2 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate">{i.product_name}</span>
                        <span className="font-medium flex-shrink-0">{fmtCLP(Math.round(i.unit_price * i.quantity))}</span>
                      </div>
                      <div className="flex items-center justify-between gap-2 mt-1.5">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setQty(idx, i.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center border border-line rounded-md"
                            aria-label={`Quitar uno de ${i.product_name}`}
                          >
                            <Minus size={13} />
                          </button>
                          <input
                            type="number"
                            inputMode="decimal"
                            min="0"
                            step="any"
                            value={i.quantity || ""}
                            onChange={(e) => setQty(idx, Number(String(e.target.value).replace(",", ".")), false)}
                            aria-label={`Cantidad de ${i.product_name}`}
                            className="w-16 px-2 py-1 border border-line rounded-md text-sm text-center"
                          />
                          <button
                            onClick={() => setQty(idx, i.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center border border-line rounded-md"
                            aria-label={`Agregar uno de ${i.product_name}`}
                          >
                            <Plus size={13} />
                          </button>
                          <span className="text-xs text-muted ml-1">× {fmtCLP(i.unit_price)}</span>
                        </div>
                        <button
                          onClick={() => setQty(idx, 0)}
                          className="text-muted hover:text-red-600"
                          aria-label={`Quitar ${i.product_name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {short && (
                        <div className="text-xs text-amber-700 mt-1">
                          Stock insuficiente: quedan {avail}. Puedes registrar la venta igual, el stock quedará negativo.
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-xs text-muted" htmlFor="venta-descuento">Descuento ($)</label>
                <input
                  id="venta-descuento"
                  type="number"
                  inputMode="numeric"
                  min="0"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  placeholder="0"
                  className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-muted" htmlFor="venta-metodo">Método de pago</label>
                <select
                  id="venta-metodo"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm capitalize"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="text-xs text-muted" htmlFor="venta-fecha">Fecha de la venta</label>
              <input
                id="venta-fecha"
                type="date"
                value={saleDate}
                max={today}
                onChange={(e) => setSaleDate(e.target.value || today)}
                className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm"
              />
            </div>

            {customers.length > 0 && (
              <div className="mb-4">
                <label className="text-xs text-muted" htmlFor="venta-cliente">Cliente (opcional)</label>
                <select
                  id="venta-cliente"
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
              <div className="flex justify-between">
                <span className="text-muted">Subtotal</span>
                <span>{fmtCLP(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted">Descuento</span>
                <span>-{fmtCLP(discountNum)}</span>
              </div>
              {discountRaw > subtotal && subtotal > 0 && (
                <div className="text-xs text-amber-700">El descuento no puede superar el subtotal.</div>
              )}
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{fmtCLP(total)}</span>
              </div>
            </div>

            {error && (
              <div role="alert" className="text-sm text-red-600 mb-3">
                {error}
              </div>
            )}

            <button
              onClick={finalize}
              disabled={saving || items.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 text-white font-semibold py-3 rounded-lg disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? "Guardando…" : isEditing ? `Guardar cambios — ${fmtCLP(total)}` : `Registrar venta — ${fmtCLP(total)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
