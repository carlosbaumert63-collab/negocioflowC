import type { Subscription } from "./types";

export const FREE_LIMITS = {
  sales: 50,
  products: 20,
};

export function isProSub(sub: Subscription | null | undefined): boolean {
  if (!sub) return false;
  // "plus" incluye todo lo de "pro" (y más), así que cuenta como Pro para
  // efectos de desbloquear funciones.
  const planIsPro = /^(pro|plus)/.test(sub.plan || "");
  const statusOk = sub.status === "active" || sub.status === "trialing";
  const notExpired = !sub.expires_at || new Date(sub.expires_at).getTime() >= Date.now();
  return planIsPro && statusOk && notExpired;
}

export function isPlusSub(sub: Subscription | null | undefined): boolean {
  if (!sub) return false;
  const planIsPlus = (sub.plan || "").startsWith("plus");
  const statusOk = sub.status === "active" || sub.status === "trialing";
  const notExpired = !sub.expires_at || new Date(sub.expires_at).getTime() >= Date.now();
  return planIsPlus && statusOk && notExpired;
}

export function daysUntil(dateIso: string | null | undefined): number | null {
  if (!dateIso) return null;
  const diff = new Date(dateIso).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const DB_ERROR_LABELS: Record<string, string> = {
  LIMIT_SALES: "Llegaste al límite de 50 ventas este mes en el plan Free.",
  LIMIT_PRODUCTS: "Llegaste al límite de 20 productos en el plan Free.",
  LIMIT_BUSINESSES: "Llegaste al límite de negocios de tu plan actual.",
  PRO_REQUIRED: "Esta función requiere el plan Pro.",
};

export function isPlanLimitError(message: string | null | undefined): boolean {
  if (!message) return false;
  return /^(LIMIT_SALES|LIMIT_PRODUCTS|LIMIT_BUSINESSES|PRO_REQUIRED):/.test(message);
}

// Los mensajes que levanta la base de datos tienen la forma "CODIGO: texto
// para el usuario" (p. ej. "INVALID_SALE: Hay una cantidad inválida.").
export function friendlyDbError(message: string | null | undefined): string {
  if (!message) return "Ocurrió un error inesperado.";
  const match = message.match(/^([A-Z][A-Z_]+):\s*([\s\S]*)$/);
  if (match) {
    return match[2]?.trim() || DB_ERROR_LABELS[match[1]] || message;
  }
  if (/row-level security/i.test(message)) {
    return "No tienes permiso para hacer esto. Si eres vendedor, esta acción es solo para el dueño del negocio.";
  }
  if (/failed to fetch|network|load failed/i.test(message)) {
    return "No hay conexión a internet. Revisa tu conexión e intenta de nuevo.";
  }
  if (/foreign key/i.test(message)) {
    return "No se puede eliminar porque tiene registros asociados.";
  }
  return message;
}
