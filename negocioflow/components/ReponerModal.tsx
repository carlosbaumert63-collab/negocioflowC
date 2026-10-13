"use client";
import React, { useEffect, useMemo, useState } from "react";
import { X, Trash2, Search, ScanBarcode, Loader2, Crown } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Business, type Product } from "../lib/types";
import { localISODate } from "../lib/dates";
import { friendlyDbError } from "../lib/plan";
import { parseCLP, parseQty, toInputNumber } from "../lib/numbers";
import { fetchAll } from "../lib/fetchAll";
import { useEscape } from "../lib/useEscape";
import { getProfile } from "../lib/businessProfiles";
import BarcodeScanner, { type ScanFeedback } from "./BarcodeScanner";
import { usePlan } from "./PlanContext";

interface Line {
  product: Product;
  qty: string;
  cost: string;
}

/**
 * Reponer mercadería desde Gastos: suma el stock, actualiza el costo y queda
 * registrado lo que se pagó. Se guarda como compra (save_purchase), así el
 * costo NO se resta dos veces de la ganancia (se descuenta al vender).
 */
export default function ReponerModal({
  business,
  onClose,
  onSaved,
}: {
  business: Business;
  onClose: () => void;
  onSaved: (total: number) => void;
}) {
  const { isPro, goToPlan } = usePlan();
  const profile = getProfile(business);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [date, setDate] = useState(localISODate());
  const [scanning, setScanning] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEscape(onClose, !saving && !scanning);

  useEffect(() => {
    fetchAll<Product>((a, b) =>
      supabase.from("products").select("*").eq("business_id", business.id).order("name").order("id").range(a, b)
    ).then(({ data }) => setProducts(data.filter((p) => p.track_stock !== false)));
  }, [business.id]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q))
      .slice(0, 8);
  }, [products, search]);

  function add(p: Product) {
    setError("");
    setLines((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id);
      if (i >= 0) {
        return prev.map((l, k) => (k === i ? { ...l, qty: toInputNumber((parseQty(l.qty) || 0) + 1) } : l));
      }
      return [...prev, { product: p, qty: "1", cost: Number(p.cost) > 0 ? String(Math.round(Number(p.cost))) : "" }];
    });
    setSearch("");
  }

  function handleScan(code: string): ScanFeedback {
    const p = products.find((x) => (x.sku || "").trim().toLowerCase() === code.trim().toLowerCase());
    if (!p) return { ok: false, text: `El código ${code} no está en tus ${profile.itemPlural}.` };
    add(p);
    return { ok: true, text: `✓ ${p.name}` };
  }

  function update(i: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l, k) => (k === i ? { ...l, ...patch } : l)));
  }

  const total = Math.round(
    lines.reduce((s, l) => s + (parseQty(l.qty) || 0) * (parseCLP(l.cost) || 0), 0)
  );

  async function save() {
    if (saving) return;
    setError("");
    if (lines.length === 0) return setError(`Agrega al menos un ${profile.itemSingular}.`);
    for (const l of lines) {
      const q = parseQty(l.qty);
      const c = parseCLP(l.cost);
      if (q === null || q <= 0) return setError(`Revisa la cantidad de "${l.product.name}".`);
      if (c === null || c < 0) return setError(`Escribe cuánto pagaste por unidad de "${l.product.name}".`);
    }
    setSaving(true);
    const { error: err } = await supabase.rpc("save_purchase", {
      p_business_id: business.id,
      p_supplier_id: null,
      p_purchase_date: date,
      p_items: lines.map((l) => ({
        product_id: l.product.id,
        quantity: parseQty(l.qty),
        unit_cost: parseCLP(l.cost),
      })),
    });
    setSaving(false);
    if (err) return setError(friendlyDbError(err.message));
    onSaved(total);
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Reponer mercadería"
        className="bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold text-lg">Reponer mercadería</div>
          <button onClick={onClose} className="text-muted" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-muted mb-4">
          Suma el stock y registra lo que pagaste. Su costo se descuenta de tu ganancia cuando vendes, así no se cuenta dos veces.
        </p>

        {!isPro ? (
          <div className="text-sm bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="font-medium flex items-center gap-1.5">
              <Crown size={15} className="text-amber-600" /> Disponible en el plan Pro
            </div>
            <p className="text-muted mt-1">
              En el plan Free puedes actualizar el stock editando cada {profile.itemSingular} en "{profile.navLabel}".
            </p>
            <button onClick={goToPlan} className="mt-3 bg-ink text-white text-sm font-medium px-4 py-2 rounded-lg">
              Ver planes
            </button>
          </div>
        ) : (
          <>
            <div className="relative mb-2">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter" || !search.trim()) return;
                  e.preventDefault();
                  const exact = products.find((p) => (p.sku || "").trim().toLowerCase() === search.trim().toLowerCase());
                  if (exact) add(exact);
                  else if (matches.length > 0) add(matches[0]);
                }}
                placeholder={`Buscar ${profile.itemSingular} por nombre o código…`}
                aria-label={`Buscar ${profile.itemSingular}`}
                className="w-full pl-9 pr-12 py-2.5 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
              <button
                type="button"
                onClick={() => setScanning(true)}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 rounded-md text-brand-700 hover:bg-surface"
                aria-label="Escanear código de barras"
              >
                <ScanBarcode size={18} />
              </button>
            </div>
            {scanning && (
              <BarcodeScanner title="Escanear lo que llegó" continuous onDetected={handleScan} onClose={() => setScanning(false)} />
            )}
            {matches.length > 0 && (
              <div className="border border-line rounded-lg mb-3 divide-y divide-line max-h-48 overflow-y-auto">
                {matches.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => add(p)}
                    className="w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left hover:bg-surface"
                  >
                    <span className="truncate">{p.name}</span>
                    <span className="text-xs text-muted flex-shrink-0">stock {Number(p.stock)}</span>
                  </button>
                ))}
              </div>
            )}
            {products.length === 0 && (
              <div className="text-sm text-muted py-3">
                Primero agrega tus {profile.itemPlural} en "{profile.navLabel}" (con control de stock).
              </div>
            )}

            {lines.length > 0 && (
              <div className="border border-line rounded-lg divide-y divide-line mb-4">
                {lines.map((l, i) => {
                  const sub = (parseQty(l.qty) || 0) * (parseCLP(l.cost) || 0);
                  return (
                    <div key={l.product.id} className="px-3 py-2.5 text-sm">
                      <div className="flex items-center justify-between gap-2">
                        <span className="min-w-0 truncate font-medium">{l.product.name}</span>
                        <button
                          onClick={() => setLines((prev) => prev.filter((_, k) => k !== i))}
                          className="text-muted hover:text-red-600"
                          aria-label={`Quitar ${l.product.name}`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 items-end">
                        <label className="text-xs text-muted">
                          Cantidad
                          <input
                            inputMode="decimal"
                            value={l.qty}
                            onChange={(e) => update(i, { qty: e.target.value })}
                            className="w-full mt-1 px-2 py-1.5 border border-line rounded-md text-sm text-ink"
                          />
                        </label>
                        <label className="text-xs text-muted">
                          Costo c/u
                          <input
                            inputMode="numeric"
                            value={l.cost}
                            onChange={(e) => update(i, { cost: e.target.value })}
                            placeholder="Ej. 1.200"
                            className="w-full mt-1 px-2 py-1.5 border border-line rounded-md text-sm text-ink"
                          />
                        </label>
                        <div className="text-right">
                          <div className="text-xs text-muted">Subtotal</div>
                          <div className="font-medium mt-1.5">{fmtCLP(sub)}</div>
                        </div>
                      </div>
                      <div className="text-[11px] text-muted mt-1">
                        Stock: {Number(l.product.stock)} → {Number(l.product.stock) + (parseQty(l.qty) || 0)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <label className="block text-xs text-muted mb-4">
              Fecha
              <input
                type="date"
                value={date}
                max={localISODate()}
                onChange={(e) => setDate(e.target.value || localISODate())}
                className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm text-ink"
              />
            </label>

            <div className="flex justify-between items-center bg-surface rounded-lg px-3 py-2.5 mb-4">
              <span className="text-sm text-muted">Total pagado</span>
              <span className="text-lg font-bold">{fmtCLP(total)}</span>
            </div>

            {error && (
              <div role="alert" className="text-sm text-red-600 mb-3">
                {error}
              </div>
            )}
            <button
              onClick={save}
              disabled={saving || lines.length === 0}
              className="w-full flex items-center justify-center gap-2 bg-brand-500 text-white font-semibold py-3 rounded-lg disabled:opacity-60"
            >
              {saving && <Loader2 size={16} className="animate-spin" />}
              {saving ? "Guardando…" : `Registrar reposición — ${fmtCLP(total)}`}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
