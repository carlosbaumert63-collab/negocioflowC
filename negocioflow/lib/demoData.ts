import { supabase } from "./supabaseClient";
import { daysAgo } from "./dates";
import { PROFILES, type BusinessProfile } from "./businessProfiles";

// Datos de demostración: siempre marcados con is_demo = true, para que se
// puedan distinguir claramente de los datos reales del negocio y borrarse
// en bloque sin tocar nada que el usuario haya cargado de verdad.

// Los productos de demostración dependen del rubro (ver businessProfiles.ts):
// una botillería ve cervezas y vinos; una peluquería, cortes y tinturas.

const PAYMENT_METHODS = ["efectivo", "débito", "crédito", "transferencia"];
const EXPENSE_SAMPLES: { description: string; category: string; amount: number }[] = [
  { description: "Arriendo local (DEMO)", category: "arriendo", amount: 280000 },
  { description: "Cuenta de luz (DEMO)", category: "servicios", amount: 45000 },
  { description: "Internet (DEMO)", category: "software", amount: 18000 },
  { description: "Publicidad redes sociales (DEMO)", category: "publicidad", amount: 25000 },
  { description: "Transporte de mercadería (DEMO)", category: "transporte", amount: 15000 },
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function seedDemoData(
  businessId: string,
  profile: BusinessProfile = PROFILES.almacen
): Promise<{ error?: string }> {
  // 1) Productos demo
  const { data: products, error: prodErr } = await supabase
    .from("products")
    .insert(profile.demoItems.map((p) => ({ ...p, business_id: businessId, is_demo: true })))
    .select();
  if (prodErr) return { error: prodErr.message };

  // 2) Ventas demo, repartidas en los últimos 30 días. Las cantidades
  // respetan el stock disponible para que ningún producto quede negativo.
  // Los servicios (stock 0) no tienen tope de cantidad.
  const tracksStock = new Set<string>((products || []).filter((p: any) => Number(p.stock) > 0).map((p: any) => p.id));
  const stockLeft = new Map<string, number>((products || []).map((p: any) => [p.id, Number(p.stock)]));
  for (let i = 0; i < 18; i++) {
    const date = daysAgo(randInt(0, 29));
    const itemCount = randInt(1, 3);
    const chosen = new Map<string, any>();
    for (let k = 0; k < itemCount; k++) {
      const p = products![randInt(0, products!.length - 1)];
      chosen.set(p.id, p);
    }

    const items = Array.from(chosen.values())
      .map((p) => {
        const wanted = randInt(1, 3);
        const quantity = tracksStock.has(p.id) ? Math.min(wanted, stockLeft.get(p.id) || 0) : wanted;
        return {
          product_id: p.id,
          product_name: p.name,
          quantity,
          unit_price: Number(p.sale_price),
          unit_cost: Number(p.cost),
        };
      })
      .filter((it) => it.quantity > 0);
    if (items.length === 0) continue;

    const subtotal = items.reduce((s, it) => s + it.unit_price * it.quantity, 0);
    const costTotal = items.reduce((s, it) => s + it.unit_cost * it.quantity, 0);
    const discount = Math.random() < 0.2 ? Math.round(subtotal * 0.05) : 0;
    const total = subtotal - discount;
    const profit = total - costTotal;

    const { data: sale, error: saleErr } = await supabase
      .from("sales")
      .insert({
        business_id: businessId,
        sale_date: date,
        payment_method: PAYMENT_METHODS[randInt(0, PAYMENT_METHODS.length - 1)],
        subtotal,
        discount,
        total,
        cost_total: costTotal,
        profit,
        is_demo: true,
      })
      .select()
      .single();
    if (saleErr || !sale) continue;

    const { error: itemsErr } = await supabase.from("sale_items").insert(items.map((it) => ({ ...it, sale_id: sale.id })));
    if (itemsErr) {
      // No dejar una venta demo sin productos.
      await supabase.from("sales").delete().eq("id", sale.id);
      continue;
    }
    items.forEach((it) => stockLeft.set(it.product_id, (stockLeft.get(it.product_id) || 0) - it.quantity));
  }

  // 3) Gastos demo
  const { error: expErr } = await supabase.from("expenses").insert(
    EXPENSE_SAMPLES.map((e) => ({
      ...e,
      business_id: businessId,
      expense_date: daysAgo(randInt(0, 29)),
      payment_method: "transferencia",
      note: null,
      is_demo: true,
    }))
  );
  if (expErr) return { error: expErr.message };

  return {};
}

export async function clearDemoData(businessId: string): Promise<{ error?: string }> {
  const { error: salesErr } = await supabase.from("sales").delete().eq("business_id", businessId).eq("is_demo", true);
  if (salesErr) return { error: salesErr.message };

  const { error: expErr } = await supabase
    .from("expenses")
    .delete()
    .eq("business_id", businessId)
    .eq("is_demo", true);
  if (expErr) return { error: expErr.message };

  const { error: prodErr } = await supabase
    .from("products")
    .delete()
    .eq("business_id", businessId)
    .eq("is_demo", true);
  if (prodErr) return { error: prodErr.message };

  return {};
}

export async function hasDemoData(businessId: string): Promise<boolean> {
  const { count } = await supabase
    .from("products")
    .select("id", { count: "exact", head: true })
    .eq("business_id", businessId)
    .eq("is_demo", true);
  return (count || 0) > 0;
}
