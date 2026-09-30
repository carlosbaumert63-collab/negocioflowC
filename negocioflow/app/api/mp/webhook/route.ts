import { NextResponse } from "next/server";
import { mpGetPayment } from "../../../../lib/mpServer";
import { confirmOrder } from "../../../../lib/checkoutCommon";

// Mercado Pago llama a esta URL server-to-server. Nunca confiamos en el
// redirect del navegador: siempre se vuelve a consultar el pago en la API
// de Mercado Pago usando el ID recibido antes de activar la suscripción.
export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    let paymentId = url.searchParams.get("data.id") || url.searchParams.get("id");

    if (!paymentId) {
      const body = await request.json().catch(() => ({}));
      paymentId = body?.data?.id || body?.id || null;
    }

    if (!paymentId) {
      return NextResponse.json({ error: "Falta payment id." }, { status: 400 });
    }

    const payment = await mpGetPayment(String(paymentId));
    if (payment.status === "approved" && payment.external_reference) {
      await confirmOrder(payment.external_reference);
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
