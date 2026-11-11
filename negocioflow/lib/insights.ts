import { supabase } from "./supabaseClient";

/** Filtros especiales de la lista de productos. */
export type ProductFilter = "low" | "no_margin" | "idle";

export interface NoMarginItem {
  id: string;
  name: string;
  sale_price: number;
  cost: number;
}

export interface IdleItem {
  id: string;
  name: string;
  stock: number;
  value: number;
  last_sold: string | null;
}

/** Lo que devuelve la función inventory_insights de la base de datos. */
export interface InventoryInsights {
  /** Días sin ventas para considerar un producto "sin movimiento". */
  idle_days: number;
  /** Se venden al costo o bajo el costo. */
  no_margin_count: number;
  no_margin: NoMarginItem[];
  /** Con stock, creados hace más de idle_days y sin ventas en ese período. */
  idle_count: number;
  /** Plata detenida: stock × costo de los productos sin movimiento. */
  idle_value: number;
  idle: IdleItem[];
  idle_ids: string[];
}

const num = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

/**
 * Productos "para revisar": los que no dejan ganancia y los que llevan tiempo
 * sin venderse. Devuelve null si falla (son avisos, no deben romper la pantalla).
 */
export async function fetchInventoryInsights(businessId: string, today: string): Promise<InventoryInsights | null> {
  const { data, error } = await supabase.rpc("inventory_insights", { p_business_id: businessId, p_today: today });
  if (error || !data) return null;
  const raw = data as any;
  return {
    idle_days: num(raw.idle_days) || 30,
    no_margin_count: num(raw.no_margin_count),
    no_margin: (raw.no_margin || []).map((x: any) => ({
      id: x.id,
      name: x.name,
      sale_price: num(x.sale_price),
      cost: num(x.cost),
    })),
    idle_count: num(raw.idle_count),
    idle_value: num(raw.idle_value),
    idle: (raw.idle || []).map((x: any) => ({
      id: x.id,
      name: x.name,
      stock: num(x.stock),
      value: num(x.value),
      last_sold: x.last_sold || null,
    })),
    idle_ids: raw.idle_ids || [],
  };
}
