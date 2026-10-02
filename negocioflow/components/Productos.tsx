"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Plus, X, Trash2, Pencil, Search, ClipboardList, Share2, Copy, Check, Loader2 } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Business, type Product } from "../lib/types";
import { friendlyDbError } from "../lib/plan";
import { parseCLP, parseQty, toInputNumber } from "../lib/numbers";

const EMPTY_FORM = { name: "", sku: "", category: "", sale_price: "", cost: "", stock: "", min_stock: "" };

export default function Productos({ business }: { business: Business }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [originalStock, setOriginalStock] = useState<string>("");
  const [error, setError] = useState("");
  const [listError, setListError] = useState("");
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [onlyLow, setOnlyLow] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showRestock, setShowRestock] = useState(false);

  const load = async () => {
    const { data, error: err } = await supabase
      .from("products")
      .select("*")
      .eq("business_id", business.id)
      .order("name", { ascending: true });
    if (err) setListError(friendlyDbError(err.message));
    setProducts((data as Product[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [business.id]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => p.category && set.add(p.category));
    return Array.from(set).sort();
  }, [products]);

  const lowStock = useMemo(
    () => products.filter((p) => Number(p.stock) <= 0 || Number(p.stock) <= Number(p.min_stock)),
    [products]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q);
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      const matchesLow = !onlyLow || Number(p.stock) <= 0 || Number(p.stock) <= Number(p.min_stock);
      return matchesQuery && matchesCategory && matchesLow;
    });
  }, [products, query, categoryFilter, onlyLow]);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setOriginalStock("");
    setError("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    const stockStr = toInputNumber(p.stock);
    setForm({
      name: p.name,
      sku: p.sku || "",
      category: p.category || "",
      sale_price: toInputNumber(p.sale_price),
      cost: toInputNumber(p.cost),
      stock: stockStr,
      min_stock: toInputNumber(p.min_stock),
    });
    setOriginalStock(stockStr);
    setError("");
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const saveProduct = async () => {
    if (saving) return;
    setError("");
    if (!form.name.trim()) return setError("Ingresa el nombre del producto.");
    // Un campo con texto que no es número se avisa; nunca se guarda 0 en silencio.
    const salePrice = parseCLP(form.sale_price);
    if (form.sale_price.trim() === "") return setError("Ingresa el precio de venta.");
    if (salePrice === null) return setError("El precio de venta no es un número válido.");
    if (salePrice < 0) return setError("El precio de venta no puede ser negativo.");
    const cost = form.cost.trim() === "" ? 0 : parseCLP(form.cost);
    if (cost === null) return setError("El costo no es un número válido.");
    if (cost < 0) return setError("El costo no puede ser negativo.");
    const stock = form.stock.trim() === "" ? 0 : parseQty(form.stock);
    if (stock === null) return setError("El stock no es un número válido.");
    const minStock = form.min_stock.trim() === "" ? 0 : parseQty(form.min_stock);
    if (minStock === null) return setError("El stock mínimo no es un número válido.");
    if (minStock < 0) return setError("El stock mínimo no puede ser negativo.");
    if (salePrice > 0 && cost > salePrice && !confirm("El costo es mayor que el precio de venta: perderás plata con cada venta. ¿Guardar igual?")) {
      return;
    }

    const payload: Record<string, unknown> = {
      business_id: business.id,
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      category: form.category.trim() || null,
      sale_price: salePrice,
      cost,
      min_stock: minStock,
    };
    // Al editar, el stock solo se envía si el usuario lo cambió. Si no, se
    // pisaría con el valor de cuando se abrió el formulario y se perderían
    // las ventas hechas mientras tanto (el stock lo mueven ventas y compras).
    if (!editingId || form.stock.trim() !== originalStock) payload.stock = stock;

    setSaving(true);
    const { error: err } = editingId
      ? await supabase.from("products").update(payload).eq("id", editingId)
      : await supabase.from("products").insert(payload);
    setSaving(false);
    if (err) return setError(friendlyDbError(err.message));

    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    load();
  };

  const removeProduct = async (p: Product) => {
    if (!confirm(`¿Eliminar "${p.name}"? Las ventas anteriores se mantienen en tu historial.`)) return;
    setListError("");
    const { error: err } = await supabase.from("products").delete().eq("id", p.id);
    if (err) {
      setListError(friendlyDbError(err.message));
      return;
    }
    setProducts((prev) => prev.filter((x) => x.id !== p.id));
  };

  const stockBadge = (p: Product) => {
    if (Number(p.stock) <= 0) return <Badge color="red">Agotado</Badge>;
    if (Number(p.stock) <= Number(p.min_stock)) return <Badge color="amber">Stock bajo</Badge>;
    return <Badge color="green">Normal</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5 gap-2 flex-wrap">
        <h1 className="text-xl font-bold">Productos</h1>
        <div className="flex items-center gap-2">
          {lowStock.length > 0 && (
            <button
              onClick={() => setShowRestock(true)}
              className="flex items-center gap-1.5 border border-line bg-white text-sm font-medium px-3 py-2 rounded-lg hover:bg-surface"
            >
              <ClipboardList size={15} /> Reponer ({lowStock.length})
            </button>
          )}
          <button
            onClick={() => (showForm ? setShowForm(false) : openNew())}
            className="flex items-center gap-1.5 bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            {showForm ? <X size={16} /> : <Plus size={16} />}
            {showForm ? "Cerrar" : "Nuevo producto"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border border-line rounded-xl p-5 mb-6">
          <div className="text-sm font-semibold mb-3">{editingId ? "Editar producto" : "Nuevo producto"}</div>
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Nombre" id="prod-nombre">
              <input id="prod-nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Código / SKU (opcional)" id="prod-sku">
              <input id="prod-sku" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Categoría" id="prod-cat">
              <input
                id="prod-cat"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                className={inputCls}
                list="category-options"
                placeholder="Ej. Bebidas, Aseo…"
              />
              <datalist id="category-options">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </FormField>
            <FormField label="Precio de venta" id="prod-precio">
              <input id="prod-precio" inputMode="numeric" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} placeholder="Ej. 1.500" className={inputCls} />
            </FormField>
            <FormField label="Costo" id="prod-costo">
              <input id="prod-costo" inputMode="numeric" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} placeholder="Lo que te cuesta a ti" className={inputCls} />
            </FormField>
            <FormField label="Stock actual" id="prod-stock">
              <input id="prod-stock" inputMode="decimal" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Stock mínimo (para avisarte)" id="prod-min">
              <input id="prod-min" inputMode="decimal" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          {(() => {
            const sp = parseCLP(form.sale_price);
            const c = parseCLP(form.cost) ?? 0;
            if (sp && sp > 0) {
              const m = ((sp - c) / sp) * 100;
              return (
                <div className={`text-xs mt-3 ${m < 0 ? "text-red-600" : "text-muted"}`}>
                  Ganas {fmtCLP(sp - c)} por unidad (margen {m.toFixed(0)}%).
                </div>
              );
            }
            return null;
          })()}
          {error && <div role="alert" className="text-sm text-red-600 mt-3">{error}</div>}
          <button
            onClick={saveProduct}
            disabled={saving}
            className="mt-4 flex items-center gap-2 bg-brand-500 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-60"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {editingId ? "Guardar cambios" : "Guardar producto"}
          </button>
        </div>
      )}

      {products.length > 0 && (
        <div className="relative mb-3">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre, código o categoría…"
            aria-label="Buscar productos"
            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-sm"
          />
        </div>
      )}

      {(categories.length > 0 || lowStock.length > 0) && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => {
              setCategoryFilter("");
              setOnlyLow(false);
            }}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              !categoryFilter && !onlyLow ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted"
            }`}
          >
            Todos
          </button>
          {lowStock.length > 0 && (
            <button
              onClick={() => setOnlyLow((v) => !v)}
              aria-pressed={onlyLow}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                onlyLow ? "border-amber-500 bg-amber-50 text-amber-700" : "border-line text-muted"
              }`}
            >
              Por reponer ({lowStock.length})
            </button>
          )}
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c === categoryFilter ? "" : c)}
              aria-pressed={categoryFilter === c}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                categoryFilter === c ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {listError && <div role="alert" className="text-sm text-red-600 mb-3">{listError}</div>}

      {loading ? (
        <div className="text-sm text-muted py-8 text-center">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted py-8 text-center">
          {products.length === 0 ? "Aún no tienes productos registrados." : "Sin resultados para esa búsqueda."}
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {filtered.map((p) => {
            const price = Number(p.sale_price);
            const profit = price - Number(p.cost);
            const margin = price > 0 ? (profit / price) * 100 : 0;
            return (
              <div key={p.id} className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line last:border-0">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {p.name}
                    {p.is_demo && <span className="text-violet-600 text-xs font-medium"> · DEMO</span>}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {fmtCLP(price)} · costo {fmtCLP(p.cost)} ·{" "}
                    <span className={margin < 0 ? "text-red-600" : ""}>margen {margin.toFixed(0)}%</span> · stock{" "}
                    {Number(p.stock)}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {stockBadge(p)}
                  <button onClick={() => openEdit(p)} className="text-muted hover:text-ink" aria-label={`Editar ${p.name}`}>
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => removeProduct(p)} className="text-muted hover:text-red-600" aria-label={`Eliminar ${p.name}`}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showRestock && (
        <RestockModal business={business} products={lowStock} onClose={() => setShowRestock(false)} />
      )}
    </div>
  );
}

// Lista de reposición: productos agotados o bajo el mínimo, con una cantidad
// sugerida para volver a 2× el mínimo. Se puede ajustar y enviar por WhatsApp.
function RestockModal({ business, products, onClose }: { business: Business; products: Product[]; onClose: () => void }) {
  const [qty, setQty] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    products.forEach((p) => {
      const min = Number(p.min_stock) || 0;
      const target = Math.max(min * 2, min + 1, 1);
      init[p.id] = String(Math.max(1, Math.ceil(target - Math.max(0, Number(p.stock)))));
    });
    return init;
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const lines = products
    .filter((p) => (parseQty(qty[p.id] || "") || 0) > 0)
    .map((p) => `• ${p.name}${p.sku ? ` (${p.sku})` : ""}: ${toInputNumber(parseQty(qty[p.id] || ""))}`);
  const estimated = products.reduce((s, p) => s + (parseQty(qty[p.id] || "") || 0) * Number(p.cost || 0), 0);
  const text = `Hola, soy de ${business.name}. Quisiera hacer el siguiente pedido:\n\n${lines.join("\n")}\n\n¡Gracias!`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // El portapapeles puede no estar disponible; WhatsApp sigue funcionando.
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Lista para reponer"
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold text-lg">Lista para reponer</div>
          <button onClick={onClose} aria-label="Cerrar" className="text-muted">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-muted mb-4">
          Productos agotados o bajo su stock mínimo. Ajusta las cantidades y envía el pedido a tu proveedor.
        </p>

        <div className="border border-line rounded-lg divide-y divide-line mb-3">
          {products.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 px-3 py-2">
              <div className="min-w-0">
                <div className="text-sm truncate">{p.name}</div>
                <div className={`text-xs ${Number(p.stock) <= 0 ? "text-red-600" : "text-amber-700"}`}>
                  Quedan {Number(p.stock)} · mínimo {Number(p.min_stock)}
                </div>
              </div>
              <input
                inputMode="decimal"
                value={qty[p.id] ?? ""}
                onChange={(e) => setQty((prev) => ({ ...prev, [p.id]: e.target.value }))}
                aria-label={`Cantidad a pedir de ${p.name}`}
                className="w-20 px-2 py-1.5 border border-line rounded-md text-sm text-center"
              />
            </div>
          ))}
        </div>

        {estimated > 0 && (
          <div className="text-xs text-muted mb-4">Costo estimado del pedido: {fmtCLP(estimated)} (según el costo registrado).</div>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={copy}
            disabled={lines.length === 0}
            className="flex items-center justify-center gap-1.5 border border-line rounded-lg py-2.5 text-sm font-medium disabled:opacity-60"
          >
            {copied ? <Check size={15} className="text-brand-600" /> : <Copy size={15} />}
            {copied ? "Copiado" : "Copiar"}
          </button>
          <a
            href={lines.length ? `https://wa.me/?text=${encodeURIComponent(text)}` : undefined}
            target="_blank"
            rel="noopener noreferrer"
            aria-disabled={lines.length === 0}
            className={`flex items-center justify-center gap-1.5 bg-brand-500 text-white rounded-lg py-2.5 text-sm font-semibold ${
              lines.length === 0 ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            <Share2 size={15} /> WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

const inputCls =
  "w-full px-3 py-2 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

function FormField({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-muted" htmlFor={id}>
        {label}
      </label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function Badge({ color, children }: { color: "red" | "amber" | "green"; children: React.ReactNode }) {
  const map = {
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-brand-50 text-brand-700",
  };
  return <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${map[color]}`}>{children}</span>;
}
