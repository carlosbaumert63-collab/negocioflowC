"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Plus, X, Trash2, Pencil, Search } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Business, type Product } from "../lib/types";
import { friendlyDbError } from "../lib/plan";

const EMPTY_FORM = { name: "", sku: "", category: "", sale_price: "", cost: "", stock: "", min_stock: "" };

export default function Productos({ business }: { business: Business }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const load = async () => {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("business_id", business.id)
      .order("name", { ascending: true });
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products.filter((p) => {
      const matchesQuery =
        !q ||
        p.name.toLowerCase().includes(q) ||
        (p.sku || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q);
      const matchesCategory = !categoryFilter || p.category === categoryFilter;
      return matchesQuery && matchesCategory;
    });
  }, [products, query, categoryFilter]);

  function openNew() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError("");
    setShowForm(true);
  }

  function openEdit(p: Product) {
    setEditingId(p.id);
    setForm({
      name: p.name,
      sku: p.sku || "",
      category: p.category || "",
      sale_price: String(p.sale_price),
      cost: String(p.cost),
      stock: String(p.stock),
      min_stock: String(p.min_stock),
    });
    setError("");
    setShowForm(true);
  }

  const saveProduct = async () => {
    setError("");
    if (!form.name.trim()) return setError("Ingresa el nombre del producto.");
    const salePrice = Number(form.sale_price);
    const cost = Number(form.cost) || 0;
    if (!Number.isFinite(salePrice) || salePrice < 0) return setError("Precio de venta inválido.");

    const payload = {
      business_id: business.id,
      name: form.name.trim(),
      sku: form.sku.trim() || null,
      category: form.category.trim() || null,
      sale_price: salePrice,
      cost,
      stock: Number(form.stock) || 0,
      min_stock: Number(form.min_stock) || 0,
    };

    const { error: err } = editingId
      ? await supabase.from("products").update(payload).eq("id", editingId)
      : await supabase.from("products").insert(payload);
    if (err) return setError(friendlyDbError(err.message));

    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
    load();
  };

  const removeProduct = async (id: string) => {
    if (!confirm("¿Eliminar este producto?")) return;
    setProducts((prev) => prev.filter((p) => p.id !== id));
    await supabase.from("products").delete().eq("id", id);
  };

  const stockBadge = (p: Product) => {
    if (p.stock <= 0) return <Badge color="red">🔴 Agotado</Badge>;
    if (p.stock <= p.min_stock) return <Badge color="amber">🟠 Stock bajo</Badge>;
    return <Badge color="green">🟢 Normal</Badge>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-xl font-bold">Productos</h1>
        <button
          onClick={() => (showForm ? setShowForm(false) : openNew())}
          className="flex items-center gap-1.5 bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-lg"
        >
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? "Cerrar" : "Nuevo producto"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white border border-line rounded-xl p-5 mb-6">
          <div className="grid sm:grid-cols-2 gap-4">
            <FormField label="Nombre">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="SKU (opcional)">
              <input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Categoría">
              <input
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
            <FormField label="Precio de venta">
              <input type="number" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Costo">
              <input type="number" value={form.cost} onChange={(e) => setForm({ ...form, cost: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Stock">
              <input type="number" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} className={inputCls} />
            </FormField>
            <FormField label="Stock mínimo">
              <input type="number" value={form.min_stock} onChange={(e) => setForm({ ...form, min_stock: e.target.value })} className={inputCls} />
            </FormField>
          </div>
          {error && <div className="text-sm text-red-600 mt-3">{error}</div>}
          <button onClick={saveProduct} className="mt-4 bg-brand-500 text-white text-sm font-semibold px-5 py-2 rounded-lg">
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
            placeholder="Buscar por nombre, SKU o categoría…"
            className="w-full pl-9 pr-3 py-2 border border-line rounded-lg text-sm"
          />
        </div>
      )}

      {categories.length > 0 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <button
            onClick={() => setCategoryFilter("")}
            className={`text-xs px-3 py-1.5 rounded-full border ${
              !categoryFilter ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted"
            }`}
          >
            Todas
          </button>
          {categories.map((c) => (
            <button
              key={c}
              onClick={() => setCategoryFilter(c === categoryFilter ? "" : c)}
              className={`text-xs px-3 py-1.5 rounded-full border ${
                categoryFilter === c ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-muted"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted py-8 text-center">Cargando…</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-muted py-8 text-center">
          {products.length === 0 ? "Aún no tienes productos registrados." : "Sin resultados para esa búsqueda."}
        </div>
      ) : (
        <div className="bg-white border border-line rounded-xl overflow-hidden">
          {filtered.map((p) => {
            const profit = p.sale_price - p.cost;
            const margin = p.sale_price > 0 ? (profit / p.sale_price) * 100 : 0;
            return (
              <div key={p.id} className="flex items-center justify-between px-4 py-3 border-b border-line last:border-0">
                <div className="min-w-0">
                  <div className="font-medium text-sm truncate">
                    {p.name}
                    {p.is_demo && <span className="text-violet-600 text-xs font-medium"> · DEMO</span>}
                  </div>
                  <div className="text-xs text-muted mt-0.5">
                    {fmtCLP(p.sale_price)} · costo {fmtCLP(p.cost)} · margen {margin.toFixed(0)}% · stock {p.stock}
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  {stockBadge(p)}
                  <button onClick={() => openEdit(p)} className="text-muted hover:text-ink">
                    <Pencil size={15} />
                  </button>
                  <button onClick={() => removeProduct(p.id)} className="text-muted hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
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

function Badge({ color, children }: { color: "red" | "amber" | "green"; children: React.ReactNode }) {
  const map = {
    red: "bg-red-50 text-red-700",
    amber: "bg-amber-50 text-amber-700",
    green: "bg-brand-50 text-brand-700",
  };
  return <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${map[color]}`}>{children}</span>;
}
