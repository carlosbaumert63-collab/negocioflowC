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
    throw new HttpError(401, "No autenticado.");
  }

  // El usuario puede tener varios negocios (multi-negocio): nos aseguramos de
  // que el negocio indicado exista y sea del dueño que está pagando, no
  // simplemente "el negocio del usuario" (eso ya no es único).
  const { data: business, error: bizErr } = await sb
    .from("businesses")
    .select("id")
    .eq("id", businessId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (bizErr || !business) {
    throw new HttpError(404, "No se encontró ese negocio para este usuario.");
  }

  // El precio SIEMPRE se resuelve server-side desde la tabla plans, nunca se
  // confía en un monto enviado por el cliente.
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
    status: "pending",
  });
  if (insertErr) {
    throw new HttpError(500, `No se pudo crear la orden: ${insertErr.message}`);
  }

  return {
    orderId,
    amount: plan.price_clp,
    planName: plan.name,
    email: user.email || "",
    businessId: business.id,
  };
}

export async function confirmOrder(orderId: string): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  const sb = createClient(url, anonKey, { auth: { persistSession: false } });

  const secret = process.env.ACTIVATION_SECRET;
  if (!secret) {
    throw new HttpError(500, "Falta ACTIVATION_SECRET en el entorno del servidor.");
  }

  const { error } = await sb.rpc("confirm_payment_order", {
    p_order_id: orderId,
    p_secret: secret,
  });
  if (error) {
    throw new HttpError(500, `No se pudo confirmar el pago: ${error.message}`);
  }
}
