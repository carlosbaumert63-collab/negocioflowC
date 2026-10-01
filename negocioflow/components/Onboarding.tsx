"use client";
import React, { useState } from "react";
import { supabase } from "../lib/supabaseClient";
import { BUSINESS_TYPES, PAYMENT_METHODS } from "../lib/types";
import { friendlyDbError } from "../lib/plan";

export default function Onboarding({
  userId,
  onDone,
  onCancel,
}: {
  userId: string;
  onDone: (businessId: string) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [businessType, setBusinessType] = useState(BUSINESS_TYPES[0]);
  const [currency] = useState("CLP");
  const [mainSaleMethod, setMainSaleMethod] = useState(PAYMENT_METHODS[0]);
  const [hasInventory, setHasInventory] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const steps = ["Nombre", "Tipo", "Moneda", "Venta", "Inventario"];

  const finish = async () => {
    if (!name.trim()) {
      setError("Ingresa el nombre de tu negocio.");
      setStep(0);
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("businesses")
      .insert({
        user_id: userId,
        name: name.trim(),
        business_type: businessType,
        currency,
        main_sale_method: mainSaleMethod,
        has_inventory: hasInventory,
        onboarding_completed: true,
      })
      .select()
      .single();
    setSaving(false);
    if (error) {
      setError(friendlyDbError(error.message));
      return;
    }
    onDone(data.id);
  };

  return (
    <div className="min-h-screen bg-surface flex items-center justify-center px-5">
      <div className="w-full max-w-md bg-white border border-line rounded-2xl p-7 shadow-sm relative">
        {onCancel && (
          <button onClick={onCancel} className="absolute top-4 right-4 text-muted hover:text-ink">
            ✕
          </button>
        )}
        <div className="flex gap-1.5 mb-6">
          {steps.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-brand-500" : "bg-line"}`}
            />
          ))}
        </div>

        {step === 0 && (
          <>
            <div className="text-lg font-semibold">¿Cómo se llama tu negocio?</div>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Minimarket Don José"
              className="w-full mt-4 px-3 py-2.5 border border-line rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
            />
          </>
        )}

        {step === 1 && (
          <>
            <div className="text-lg font-semibold">¿Qué tipo de negocio es?</div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {BUSINESS_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setBusinessType(t)}
                  className={`px-3 py-2.5 rounded-lg text-sm border ${
                    businessType === t ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-ink"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div className="text-lg font-semibold">Moneda</div>
            <div className="mt-4 px-3 py-2.5 rounded-lg border border-line bg-surface text-sm text-muted">
              Pesos chilenos (CLP) — por ahora es la única moneda disponible.
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="text-lg font-semibold">¿Cuál es tu método principal de venta?</div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {PAYMENT_METHODS.map((m) => (
                <button
                  key={m}
                  onClick={() => setMainSaleMethod(m)}
                  className={`px-3 py-2.5 rounded-lg text-sm border capitalize ${
                    mainSaleMethod === m ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-ink"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>
          </>
        )}

        {step === 4 && (
          <>
            <div className="text-lg font-semibold">¿Tienes inventario de productos?</div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button
                onClick={() => setHasInventory(true)}
                className={`px-3 py-2.5 rounded-lg text-sm border ${
                  hasInventory ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-ink"
                }`}
              >
                Sí
              </button>
              <button
                onClick={() => setHasInventory(false)}
                className={`px-3 py-2.5 rounded-lg text-sm border ${
                  !hasInventory ? "border-brand-500 bg-brand-50 text-brand-700" : "border-line text-ink"
                }`}
              >
                No
              </button>
            </div>
          </>
        )}

        {error && <div className="text-sm text-red-600 mt-4">{error}</div>}

        <div className="flex justify-between mt-7">
          {step > 0 ? (
            <button onClick={() => setStep(step - 1)} className="text-sm text-muted">
              Atrás
            </button>
          ) : (
            <span />
          )}
          {step < steps.length - 1 ? (
            <button
              onClick={() => setStep(step + 1)}
              className="bg-brand-500 text-white text-sm font-semibold px-5 py-2 rounded-lg"
            >
              Siguiente
            </button>
          ) : (
            <button
              onClick={finish}
              disabled={saving}
              className="bg-brand-500 text-white text-sm font-semibold px-5 py-2 rounded-lg disabled:opacity-60"
            >
              {saving ? "Guardando…" : "Comenzar"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
