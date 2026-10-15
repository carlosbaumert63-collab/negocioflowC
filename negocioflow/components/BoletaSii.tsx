"use client";
import React, { useState } from "react";
import { X, Copy, Check, ExternalLink, Loader2, Receipt } from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { fmtCLP, type Sale } from "../lib/types";
import { friendlyDbError } from "../lib/plan";
import { useEscape } from "../lib/useEscape";

const PLAY = "https://play.google.com/store/apps/details?id=cl.sii.eboleta";
const APPSTORE = "https://apps.apple.com/cl/app/e-boleta/id1532110881";
const SII = "https://www.sii.cl";

function platform(): "android" | "ios" | "desktop" {
  if (typeof navigator === "undefined") return "desktop";
  const ua = navigator.userAgent || "";
  if (/android/i.test(ua)) return "android";
  if (/iphone|ipad|ipod/i.test(ua)) return "ios";
  return "desktop";
}

/**
 * Atajo al sistema GRATUITO del SII (e-Boleta). NegocioFlow no emite la
 * boleta: copia el monto, abre la app/web del SII y deja la venta marcada
 * como "con boleta" (con folio opcional) para llevar el control.
 */
export default function BoletaSii({
  sale,
  onClose,
  onSaved,
}: {
  sale: Sale;
  onClose: () => void;
  onSaved: (s: Sale) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [folio, setFolio] = useState(sale.boleta_folio || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEscape(onClose, !saving);
  const p = platform();
  const amount = String(Math.round(Number(sale.total)));
  const done = !!sale.boleta_sii_at;

  async function copy() {
    try {
      await navigator.clipboard.writeText(amount);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function mark(emitted: boolean) {
    setSaving(true);
    setError("");
    const patch = emitted
      ? { boleta_sii_at: new Date().toISOString(), boleta_folio: folio.trim() || null }
      : { boleta_sii_at: null, boleta_folio: null };
    const { error: err } = await supabase.from("sales").update(patch).eq("id", sale.id);
    setSaving(false);
    if (err) return setError(friendlyDbError(err.message));
    onSaved({ ...sale, ...patch });
  }

  const openHref = p === "android" ? PLAY : p === "ios" ? APPSTORE : SII;
  const openLabel = p === "desktop" ? "Abrir sii.cl" : "Abrir app e-Boleta del SII";

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[60] p-0 sm:p-4" onClick={() => !saving && onClose()}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Boleta en el SII"
        className="bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[92vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-1">
          <div className="font-bold text-lg flex items-center gap-2">
            <Receipt size={18} className="text-brand-600" /> Boleta en el SII
          </div>
          <button onClick={onClose} className="text-muted" aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        <p className="text-xs text-muted mb-4">
          Usa el sistema gratuito del SII (e-Boleta). Solo necesitas el monto total de la venta.
        </p>

        <div className="bg-surface rounded-xl p-4 flex items-center justify-between gap-3">
          <div>
            <div className="text-xs text-muted">Monto total</div>
            <div className="text-2xl font-bold">{fmtCLP(sale.total)}</div>
          </div>
          <button
            onClick={copy}
            className="flex items-center gap-1.5 text-sm font-semibold px-3 py-2 rounded-lg border border-line bg-white"
          >
            {copied ? <Check size={15} className="text-brand-600" /> : <Copy size={15} />}
            {copied ? "Copiado" : "Copiar monto"}
          </button>
        </div>

        <a
          href={openHref}
          target="_blank"
          rel="noopener noreferrer"
          onClick={copy}
          className="mt-3 w-full flex items-center justify-center gap-2 bg-ink text-white font-semibold py-3 rounded-lg"
        >
          {openLabel} <ExternalLink size={15} />
        </a>

        <ol className="mt-4 space-y-1.5 text-sm text-muted list-decimal pl-5">
          {p === "desktop" ? (
            <li>
              En sii.cl entra a <span className="text-ink">Servicios Online → Boleta de Ventas y Servicios Electrónica →
              Sistema de Emisión de Boletas Electrónicas SII</span>.
            </li>
          ) : (
            <li>Si no tienes la app, instálala (es gratis) e ingresa con tu RUT y Clave Tributaria.</li>
          )}
          <li>Pega el monto ({fmtCLP(sale.total)}) y toca Emitir.</li>
          <li>Vuelve aquí y marca la venta como emitida.</li>
        </ol>

        <label className="block text-xs text-muted mt-5">
          N° de folio de la boleta (opcional)
          <input
            inputMode="numeric"
            value={folio}
            onChange={(e) => setFolio(e.target.value)}
            placeholder="Ej. 1234"
            className="w-full mt-1 px-3 py-2 border border-line rounded-lg text-sm text-ink"
          />
        </label>

        {error && (
          <div role="alert" className="text-sm text-red-600 mt-3">
            {error}
          </div>
        )}

        <button
          onClick={() => mark(true)}
          disabled={saving}
          className="mt-4 w-full flex items-center justify-center gap-2 bg-brand-500 text-white font-semibold py-3 rounded-lg disabled:opacity-60"
        >
          {saving && <Loader2 size={16} className="animate-spin" />}
          {done ? "Guardar folio" : "Ya la emití: marcar venta con boleta"}
        </button>
        {done && (
          <button onClick={() => mark(false)} disabled={saving} className="mt-2 w-full text-sm text-muted py-2">
            Quitar marca de boleta
          </button>
        )}
        <p className="text-[11px] text-muted mt-3">
          NegocioFlow no emite la boleta por ti: solo te lleva al SII y guarda el registro. Las ventas pagadas con tarjeta en
          máquinas como Transbank, Getnet o SumUp ya tienen su comprobante válido como boleta.
        </p>
      </div>
    </div>
  );
}
