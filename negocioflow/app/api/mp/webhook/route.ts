import { NextResponse } from "next/server";
import { mpGetPayment } from "../../../../lib/mpServer";
import { confirmOrder } from "../../../../lib/checkoutCommon";

// Mercado Pago llama a esta URL server-to-server. Nunca confiamos en el
// redirect del navegador: siempre se vuelve a consultar el pago en la API
// de Mercado Pago usando el ID recibido antes de activar la suscripción.
// confirmOrder es idempotente, así que los avisos repetidos son seguros.
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const body = request.method === "POST" ? await request.json().catch(() => ({})) : {};

    // MP también envía avisos de otros tipos (p. ej. merchant_order). Solo
    // procesamos pagos; el resto se responde 200 para que no reintente.
    const kind = url.searchParams.get("type") || url.searchParams.get("topic") || body?.type || body?.topic;
    if (kind && kind !== "payment") {
      return NextResponse.json({ ignored: kind });
    }

    const paymentId = url.searchParams.get("data.id") || url.searchParams.get("id") || body?.data?.id || null;
    if (!paymentId) {
      return NextResponse.json({ error: "Falta payment id." }, { status: 400 });
    }

    const payment = await mpGetPayment(String(paymentId));
    if (payment.status === "approved" && payment.external_reference) {
      if (payment.currency_id && payment.currency_id !== "CLP") {
        console.error("mp webhook: moneda inesperada", payment.currency_id, payment.external_reference);
      } else {
        await confirmOrder(payment.external_reference, Number(payment.transaction_amount));
      }
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("mp webhook error", err);
    return NextResponse.json({ error: err.message || "Error inesperado." }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return POST(request);
}
