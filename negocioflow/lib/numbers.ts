// Interpretación de números escritos "a la chilena".
//  - Montos en pesos: "1.500", "20.000", "$ 25.000", "1500" -> enteros.
//  - Cantidades/stock: "2,5" o "2.5" -> 2.5 ; "1.500" -> 1500.
// Devuelven null si el texto no es un número válido (para poder avisar al
// usuario en vez de guardar 0 en silencio).

const THOUSANDS = /^-?[1-9]\d{0,2}([.,]\d{3})+$/;

function normalize(raw: string): string {
  return String(raw ?? "").trim().replace(/\$/g, "").replace(/\s/g, "");
}

/** Monto en pesos (entero). "" -> null. */
export function parseCLP(raw: string): number | null {
  const s = normalize(raw);
  if (s === "") return null;
  let n: number;
  if (THOUSANDS.test(s)) n = Number(s.replace(/[.,]/g, ""));
  else n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n) : null;
}

/** Cantidad o stock (admite decimales, p. ej. kilos). "" -> null. */
export function parseQty(raw: string): number | null {
  const s = normalize(raw);
  if (s === "") return null;
  let n: number;
  // Solo el punto se toma como separador de miles ("1.500"); la coma es decimal ("2,5").
  if (/^-?[1-9]\d{0,2}(\.\d{3})+$/.test(s)) n = Number(s.replace(/\./g, ""));
  else n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 1000) / 1000 : null;
}

/** Número a texto editable con coma decimal (2.5 -> "2,5"). */
export function toInputNumber(n: number | string | null | undefined): string {
  if (n === null || n === undefined || n === "") return "";
  const v = Number(n);
  return Number.isFinite(v) ? String(v).replace(".", ",") : "";
}
