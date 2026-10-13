"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Minus, X, Trash2, Search, Pencil, Undo2, Receipt, Loader2, FileDown, ScanBarcode } from "lucide-react";
import BarcodeScanner, { type ScanFeedback } from "./BarcodeScanner";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, PAYMENT_METHODS, type Business, type Product, type Sale, type SaleItem, type Customer } from "../lib/types";
import { getProfile } from "../lib/businessProfiles";
import { localISODate, formatDateCL } from "../lib/dates";
import { parseCLP, parseQty } from "../lib/numbers";
import { friendlyDbError } from "../lib/plan";
import { exportSaleReceiptPDF } from "../lib/export";
import { usePlan } from "./PlanContext";
import { fetchAll } from "../lib/fetchAll";

const PAGE_SIZE = 50;

export default function Ventas({ business }: { business: Business }) {
  const profile = getProfile(business);
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
  const [savedMsg, setSavedMsg] = useState("");

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
      fetchAll<Product>((a, b) =>
        supabase.from("products").select("*").eq("business_id", business.id).order("name").order("id").range(a, b)
      ),
      fetchAll<Customer>((a, b) =>
        supabase.from("customers").select("*").eq("business_id", business.id).order("name").order("id").range(a, b)
      ),
    ]);
    setListError(salesRes.error ? friendlyDbError(salesRes.error.message) : "");
    const list = (salesRes.data as Sale[]) || [];
    setSales(list);
    setHasMore(list.length === PAGE_SIZE);
    setProducts(productsRes.data);
    setCustomers(customersRes.data);
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
    if (
      !confirm(
        business.has_inventory
          ? `¿Anular esta venta? Se devolverá el stock de los ${profile.itemPlural}.`
          : "¿Anular esta venta? Dejará de contar en tus totales."
      )
    )
      return;
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
            setSavedMsg("");
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
            placeholder={`Buscar por ${profile.itemSingular}, cliente, método de pago o fecha…`}
            aria-label="Buscar ventas"
            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-sm"
          />
        </div>
      )}

      {listError && <div className="text-sm text-red-600 mb-3">{listError}</div>}
      {savedMsg && (
        <div role="status" className="flex items-center justify-between gap-2 text-sm bg-brand-50 text-brand-700 border border-brand-100 rounded-lg px-3 py-2 mb-3">
          <span>{savedMsg}</span>
          <button
            onClick={() => {
              setSavedMsg("");
              setEditingSale(null);
              setShowModal(true);
            }}
            className="font-semibold underline flex-shrink-0"
          >
            Otra venta
          </button>
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
          onProductCreated={(p) => setProducts((prev) => [...prev, p].sort((a, b) => a.name.localeCompare(b.name, "es")))}
          onSaved={(msg) => {
            setShowModal(false);
            setSavedMsg(msg);
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
  onProductCreated,
}: {
  business: Business;
  products: Product[];
  customers: Customer[];
  existingSale?: Sale | null;
  onClose: () => void;
  onSaved: (message: string) => void;
  onProductCreated: (p: Product) => void;
}) {
  const isEditing = !!existingSale;
  const profile = getProfile(business);
  const item = profile.itemSingular;
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
  const [scanning, setScanning] = useState(false);
  // Código escaneado que no existe: se ofrece crear el producto ahí mismo.
  const [newCode, setNewCode] = useState<string | null>(null);
  const [cashGiven, setCashGiven] = useState("");

  // Cerrar con Escape (si no se está guardando ni está abierto el lector).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving && !scanning) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, saving, scanning]);

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
    // Servicios / productos sin control de stock: no hay tope ni aviso.
    if (!product || !business.has_inventory || product.track_stock === false) return null;
    const original = (existingSale?.sale_items || [])
      .filter((i) => i.product_id === productId)
      .reduce((s, i) => s + Number(i.quantity), 0);
    return Number(product.stock) + original;
  }

  /** Producto cuyo código coincide exacto (lector de barras o cámara). */
  function findByCode(code: string): Product | undefined {
    const c = code.trim().toLowerCase();
    if (!c) return undefined;
    return products.find((p) => (p.sku || "").trim().toLowerCase() === c);
  }

  function handleScan(code: string): ScanFeedback {
    const product = findByCode(code);
    if (!product) {
      // Se cierra la cámara y se muestra el formulario para crearlo.
      setNewCode(code.trim());
      setScanning(false);
      return { ok: false, text: `El código ${code} no está registrado.` };
    }
    addProduct(product, false);
    const already = items.find((i) => i.product_id === product.id);
    const qty = (already?.quantity || 0) + 1;
    return { ok: true, text: `✓ ${product.name}${qty > 1 ? ` (x${qty})` : ""} · ${fmtCLP(product.sale_price)}` };
  }

  function addProduct(product: Product, focusSearch = true) {
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
    if (focusSearch) searchRef.current?.focus();
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
  // Vuelto: solo para pagos en efectivo que no quedan al fiado.
  const showCash = paymentMethod === "efectivo" && !(customerId && pendingPayment) && total > 0;
  const cashNum = showCash ? parseCLP(cashGiven) : null;
  const change = cashNum !== null && cashNum > 0 ? cashNum - total : null;
  const billOptions = useMemo(() => {
    if (total <= 0) return [] as number[];
    const opts = new Set<number>();
    opts.add(Math.ceil(total / 1000) * 1000);
    for (const b of [2000, 5000, 10000, 20000]) if (b >= total) opts.add(b);
    opts.add(Math.ceil(total / 10000) * 10000);
    return Array.from(opts).filter((v) => v > total).sort((a, b) => a - b).slice(0, 4);
  }, [total]);
  const today = localISODate();

  const finalize = async () => {
    if (saving) return;
    setError("");
    if (items.length === 0) return setError(`Agrega al menos un ${item}.`);
    if (items.some((i) => !Number.isFinite(i.quantity) || i.quantity <= 0))
      return setError(`Hay un ${item} con cantidad 0. Corrígela o quítalo de la venta.`);
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
    const changeTxt = change !== null && change > 0 ? ` · vuelto ${fmtCLP(change)}` : "";
    onSaved(isEditing ? "Venta actualizada." : `Venta de ${fmtCLP(total)} registrada${changeTxt}.`);
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
            Primero agrega tus {profile.itemPlural} en la sección "{profile.navLabel}" para poder venderlos.
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
                  if (e.key !== "Enter" || !search.trim()) return;
                  e.preventDefault();
                  // Un lector de barras USB/Bluetooth "escribe" el código y
                  // presiona Enter: primero se busca el código exacto.
                  const exact = findByCode(search);
                  if (exact) return addProduct(exact);
                  // Un código largo de solo números que no existe no se
                  // confunde con otro producto que lo contenga.
                  if (/^\d{6,}$/.test(search.trim())) {
                    setNewCode(search.trim());
                    setSearch("");
                    return;
                  }
                  if (matches.length > 0) addProduct(matches[0]);
                }}
                placeholder={`Buscar ${item} por nombre, código o categoría…`}
                aria-label={`Buscar ${item}`}
                autoFocus={!isEditing}
                className="w-full pl-9 pr-12 py-2.5 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setScanning(true)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-md text-brand-700 hover:bg-surface"
                aria-label="Escanear código de barras con la cámara"
                title="Escanear con la cámara"
              >
                <ScanBarcode size={18} />
              </button>
            </div>
            {newCode && (
              <QuickCreateProduct
                business={business}
                code={newCode}
                onCancel={() => {
                  setNewCode(null);
                  searchRef.current?.focus();
                }}
                onCreated={(p) => {
                  onProductCreated(p);
                  addProduct(p);
                  setNewCode(null);
                }}
              />
            )}
            {scanning && (
              <BarcodeScanner
                title="Escanear productos"
                continuous
                onDetected={handleScan}
                onClose={() => setScanning(false)}
              />
            )}

            <div className="border border-line rounded-lg max-h-44 overflow-y-auto mb-4 divide-y divide-line">
              {matches.length === 0 ? (
                <div className="px-3 py-3 text-sm text-muted">No hay {profile.itemPlural} que coincidan.</div>
              ) : (
                matches.map((p) => {
                  const tracked = business.has_inventory && p.track_stock !== false;
                  const out = tracked && Number(p.stock) <= 0;
                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-surface"
                    >
                      <span className="min-w-0 truncate">
                        {p.name}
                        {tracked && (
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

            {showCash && !isEditing && (
              <div className="mb-4">
                <label className="text-xs text-muted" htmlFor="venta-paga-con">Paga con (opcional, para calcular el vuelto)</label>
                <div className="flex gap-2 mt-1">
                  <input
                    id="venta-paga-con"
                    inputMode="numeric"
                    value={cashGiven}
                    onChange={(e) => setCashGiven(e.target.value)}
                    placeholder="Ej. 10.000"
                    className="flex-1 min-w-0 px-3 py-2 border border-line rounded-lg text-sm"
                  />
                </div>
                <div className="flex gap-1.5 mt-2 flex-wrap">
                  {billOptions.map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setCashGiven(String(b))}
                      className={`text-xs px-2.5 py-1 rounded-full border ${
                        cashNum === b ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted"
                      }`}
                    >
                      {fmtCLP(b)}
                    </button>
                  ))}
                </div>
                {change !== null && (
                  <div
                    className={`mt-2 text-base font-bold ${change < 0 ? "text-red-600" : "text-brand-700"}`}
                    aria-live="polite"
                  >
                    {change < 0 ? `Faltan ${fmtCLP(-change)}` : change === 0 ? "Pago exacto, sin vuelto" : `Vuelto: ${fmtCLP(change)}`}
                  </div>
                )}
              </div>
            )}

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

/** Crear un producto al vuelo desde un código escaneado que no existe. */
function QuickCreateProduct({
  business,
  code,
  onCancel,
  onCreated,
}: {
  business: Business;
  code: string;
  onCancel: () => void;
  onCreated: (p: Product) => void;
}) {
  const profile = getProfile(business);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const tracks = business.has_inventory && profile.hasInventory;

  async function save() {
    if (busy) return;
    setErr("");
    if (!name.trim()) return setErr("Escribe el nombre.");
    const sp = parseCLP(price);
    if (sp === null || sp <= 0) return setErr("Escribe el precio de venta (por ejemplo 1.500).");
    const st = stock.trim() === "" ? null : parseQty(stock);
    if (stock.trim() !== "" && st === null) return setErr("El stock no es un número válido.");
    setBusy(true);
    const payload: Record<string, unknown> = {
      business_id: business.id,
      name: name.trim(),
      sku: code,
      sale_price: sp,
      cost: 0,
      min_stock: 0,
    };
    if (business.has_inventory) {
      // Sin stock indicado, el producto se crea sin control de stock (se puede activar después).
      payload.track_stock = tracks && st !== null;
      if (st !== null) payload.stock = st;
    }
    const { data, error } = await supabase.from("products").insert(payload).select("*").single();
    setBusy(false);
    if (error || !data) return setErr(friendlyDbError(error?.message || "No se pudo crear."));
    onCreated(data as Product);
  }

  return (
    <div className="border border-amber-300 bg-amber-50 rounded-lg p-3 mb-3">
      <div className="text-sm font-medium mb-2">
        El código {code} no está registrado. ¿Lo creas ahora?
      </div>
      <div className="grid grid-cols-2 gap-2">
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={`Nombre del ${profile.itemSingular}`}
          aria-label="Nombre"
          className="col-span-2 px-3 py-2 border border-line rounded-lg text-sm bg-white"
        />
        <input
          inputMode="numeric"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && save()}
          placeholder="Precio de venta"
          aria-label="Precio de venta"
          className="px-3 py-2 border border-line rounded-lg text-sm bg-white"
        />
        {business.has_inventory && (
          <input
            inputMode="decimal"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && save()}
            placeholder="Stock (opcional)"
            aria-label="Stock actual"
            className="px-3 py-2 border border-line rounded-lg text-sm bg-white"
          />
        )}
      </div>
      <div className="text-[11px] text-muted mt-1.5">El costo y la categoría los puedes completar después en "{profile.navLabel}".</div>
      {err && <div role="alert" className="text-xs text-red-600 mt-1.5">{err}</div>}
      <div className="flex gap-2 mt-2">
        <button
          onClick={save}
          disabled={busy}
          className="flex items-center gap-1.5 bg-brand-500 text-white text-sm font-semibold px-3 py-1.5 rounded-lg disabled:opacity-60"
        >
          {busy && <Loader2 size={13} className="animate-spin" />} Crear y agregar
        </button>
        <button onClick={onCancel} className="text-sm text-muted px-2">
          Cancelar
        </button>
      </div>
    </div>
  );
}
