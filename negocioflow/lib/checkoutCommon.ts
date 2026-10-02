import { createClient } from "@supabase/supabase-js";

export class HttpError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function supabaseForRequest(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

// Verifica la configuración ANTES de crear la orden: si falta algo, el
// usuario ve un error claro en vez de pagar y quedar sin activación.
function assertConfigured(provider: "flow" | "mp") {
  const missing: string[] = [];
  if (!process.env.ACTIVATION_SECRET) missing.push("ACTIVATION_SECRET");
  if (provider === "flow") {
    if (!process.env.FLOW_API_KEY) missing.push("FLOW_API_KEY");
    if (!process.env.FLOW_SECRET_KEY) missing.push("FLOW_SECRET_KEY");
  } else if (!process.env.MP_ACCESS_TOKEN) {
    missing.push("MP_ACCESS_TOKEN");
  }
  if (missing.length) {
    console.error(`checkout ${provider}: faltan variables de entorno: ${missing.join(", ")}`);
    throw new HttpError(
      503,
      provider === "mp"
        ? "Mercado Pago todavía no está disponible. Prueba pagando con Flow."
        : "Los pagos con Flow no están disponibles en este momento. Intenta más tarde."
    );
  }
}

export async function prepareOrder(
  request: Request,
  provider: "flow" | "mp"
): Promise<{
  orderId: string;
  amount: number;
  planName: string;
  email: string;
  businessId: string;
}> {
  assertConfigured(provider);

  const body = await request.json().catch(() => ({}));
  const planId = body.planId as string;
  const businessId = body.businessId as string | undefined;
  const VALID_PLANS = ["pro_monthly", "pro_annual", "plus_monthly", "plus_annual"];
  if (!planId || !VALID_PLANS.includes(planId)) {
    throw new HttpError(400, "planId inválido.");
  }
  if (!businessId) {
    throw new HttpError(400, "Falta el negocio a suscribir.");
  }

  const sb = supabaseForRequest(request);
  const {
    data: { user },
    error: userErr,
  } = await sb.auth.getUser();
  if (userErr || !user) {
    throw new HttpError(401, "Tu sesión expiró. Vuelve a iniciar sesión.");
  }
  if (!user.email) {
    throw new HttpError(400, "Tu cuenta no tiene un correo asociado, necesario para el comprobante de pago.");
  }

  // Solo el dueño puede pagar por su negocio (un vendedor no).
  const { data: business, error: bizErr } = await sb
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (bizErr || !business) {
    throw new HttpError(403, "Solo el dueño del negocio puede contratar un plan.");
  }

  // El precio SIEMPRE se resuelve server-side desde la tabla plans. Además,
  // un trigger en payment_orders guarda el monto esperado desde plans, así
  // que la confirmación puede verificar que se pagó lo que correspondía.
  const { data: plan, error: planErr } = await sb
    .from("plans")
    .select("id, name, price_clp")
    .eq("id", planId)
    .maybeSingle();
  if (planErr || !plan) {
    throw new HttpError(404, "Plan no encontrado.");
  }

  const orderId = `nf_${provider}_${business.id.slice(0, 8)}_${Date.now()}`;

  const { error: insertErr } = await sb.from("payment_orders").insert({
    order_id: orderId,
    business_id: business.id,
    plan_id: plan.id,
    provider,
  });
  if (insertErr) {
    console.error("payment_orders insert", insertErr);
    throw new HttpError(500, "No se pudo crear la orden de pago. Intenta de nuevo.");
  }

  return {
    orderId,
    amount: plan.price_clp,
    planName: plan.name,
    email: user.email,
    businessId: business.id,
  };
}

/**
 * Activa la suscripción de una orden pagada. Es idempotente en la base de
 * datos: si Flow o Mercado Pago avisan varias veces del mismo pago, solo el
 * primer aviso extiende la suscripción. Si se pasa `paidAmount`, la base de
 * datos verifica que cubra el precio del plan antes de activar.
 */
export async function confirmOrder(orderId: string, paidAmount?: number): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  // Se prefiere la clave de servidor (service role); así, una vez desplegado
  // este código, se puede quitar el permiso público de confirm_payment_order.
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string);
  const sb = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  const secret = process.env.ACTIVATION_SECRET;
  if (!secret) {
    throw new HttpError(500, "Falta ACTIVATION_SECRET en el entorno del servidor.");
  }

  const params: Record<string, unknown> = { p_order_id: orderId, p_secret: secret };
  if (typeof paidAmount === "number" && Number.isFinite(paidAmount)) {
    params.p_paid_amount = paidAmount;
  }
  const { error } = await sb.rpc("confirm_payment_order", params);
  if (error) {
    throw new HttpError(500, `No se pudo confirmar el pago: ${error.message}`);
  }
}

/** Resultado normalizado de un pago para redirigir al usuario. */
export type PaymentOutcome = "success" | "failed" | "pending";
