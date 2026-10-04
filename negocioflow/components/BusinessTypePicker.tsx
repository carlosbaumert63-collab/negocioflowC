"use client";
import React from "react";
import { PROFILES, PROFILE_ORDER, getProfile, matchDescription, type ProfileId } from "../lib/businessProfiles";

export interface BusinessTypeValue {
  type: ProfileId;
  description: string;
}

/** Selector de rubro: tarjetas con emoji y, en "Otro", un campo libre con vista previa. */
export default function BusinessTypePicker({
  value,
  onChange,
  autoFocusDescription = false,
}: {
  value: BusinessTypeValue;
  onChange: (v: BusinessTypeValue) => void;
  /** Enfocar el campo "Cuéntanos qué haces" al elegir "Otro" (solo en el registro). */
  autoFocusDescription?: boolean;
}) {
  const preview = value.type === "otro" ? getProfile({ business_type: "otro", business_description: value.description }) : null;
  const matched = value.type === "otro" && !!matchDescription(value.description);

  return (
    <div>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="Tipo de negocio">
        {PROFILE_ORDER.map((id) => {
          const p = PROFILES[id];
          const selected = value.type === id;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange({ type: id, description: id === "otro" ? value.description : "" })}
              className={`flex items-start gap-2 px-3 py-2.5 rounded-lg text-left border transition-colors ${
                selected ? "border-brand-500 bg-brand-50" : "border-line hover:bg-surface"
              }`}
            >
              <span className="text-lg leading-none mt-0.5" aria-hidden>
                {p.emoji}
              </span>
              <span className="min-w-0">
                <span className={`block text-sm font-medium ${selected ? "text-brand-700" : "text-ink"}`}>{p.label}</span>
                <span className="block text-[11px] text-muted leading-tight mt-0.5">{p.hint}</span>
              </span>
            </button>
          );
        })}
      </div>

      {value.type === "otro" && (
        <div className="mt-4">
          <label htmlFor="biz-desc" className="text-sm font-medium">
            Cuéntanos qué haces
          </label>
          <input
            id="biz-desc"
            value={value.description}
            maxLength={200}
            autoFocus={autoFocusDescription}
            onChange={(e) => onChange({ type: "otro", description: e.target.value })}
            placeholder="Ej. vendo repuestos de autos"
            className="w-full mt-1.5 px-3 py-2.5 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          {preview && value.description.trim().length >= 3 && (
            <div className="mt-3 text-xs rounded-lg border border-line bg-surface px-3 py-2.5" aria-live="polite">
              {matched ? (
                <>
                  <div className="text-ink font-medium mb-1">
                    {preview.emoji} Te dejamos todo listo para: {preview.label}
                  </div>
                  <div className="text-muted">Categorías sugeridas: {preview.categories.join(", ")}.</div>
                  <div className="text-muted mt-1">¿No es así? Elige el rubro más parecido en la lista de arriba.</div>
                </>
              ) : (
                <div className="text-muted">
                  Usaremos una configuración general. Podrás crear tus propias categorías al cargar tus{" "}
                  {preview.itemPlural}.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
