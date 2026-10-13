import { supabase } from "./supabaseClient";

export interface CatalogHit {
  name: string;
  source: "negocioflow" | "openfoodfacts";
}

const cache = new Map<string, CatalogHit | null>();

/**
 * Busca el nombre de un producto por su código de barras:
 * 1) en el catálogo compartido de NegocioFlow (lo que otros negocios ya cargaron),
 * 2) si no está, en Open Food Facts (base pública de productos).
 * Nunca lanza error: si no encuentra nada devuelve null.
 */
export async function lookupBarcode(rawCode: string): Promise<CatalogHit | null> {
  const code = rawCode.trim();
  if (!/^\d{8,14}$/.test(code)) return null;
  if (cache.has(code)) return cache.get(code)!;

  let hit: CatalogHit | null = null;
  try {
    const { data } = await supabase.rpc("catalog_lookup", { p_code: code });
    if (typeof data === "string" && data.trim()) hit = { name: data.trim(), source: "negocioflow" };
  } catch {
    /* sin conexión o sin sesión: seguimos */
  }

  if (!hit) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 4500);
      const res = await fetch(
        `https://world.openfoodfacts.org/api/v2/product/${code}.json?fields=product_name,product_name_es,brands,quantity`,
        { signal: ctrl.signal }
      );
      clearTimeout(t);
      if (res.ok) {
        const j = await res.json();
        const p = j?.status === 1 ? j.product : null;
        const base = String(p?.product_name_es || p?.product_name || "").trim();
        if (base) {
          const brand = String(p?.brands || "").split(",")[0].trim();
          const qty = String(p?.quantity || "").trim();
          let name = base;
          if (brand && !name.toLowerCase().includes(brand.toLowerCase())) name = `${name} ${brand}`;
          if (qty && !name.toLowerCase().includes(qty.toLowerCase())) name = `${name} ${qty}`;
          hit = { name: name.replace(/\s+/g, " ").slice(0, 120), source: "openfoodfacts" };
        }
      }
    } catch {
      /* Open Food Facts no respondió: no pasa nada */
    }
  }

  cache.set(code, hit);
  return hit;
}
