import { NextResponse } from "next/server";
import { mpGetPayment } from "../../../../lib/mpServer";
import { confirmOrder, type PaymentOutcome } from "../../../../lib/checkoutCommon";

// Mercado Pago redirige aquí al usuario tras el pago con ?payment_id=...
// Nunca confiamos en el `status` de la URL: consultamos el pago a la API de
// MP. Si está aprobado lo confirmamos (idempotente) por si el webhook se demora.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const paymentId = url.searchParams.get("payment_id") || url.searchParams.get("collection_id");
  let outcome: PaymentOutcome = "pending";

  if (paymentId && paymentId !== "null") {
    try {
      const payment = await mpGetPayment(paymentId);
      if (payment.status === "approved" && payment.external_reference && (!payment.currency_id || payment.currency_id === "CLP")) {
        await confirmOrder(payment.external_reference, Number(payment.transaction_amount));
        outcome = "success";
      } else if (payment.status === "rejected" || payment.status === "cancelled") {
        outcome = "failed";
      }
    } catch (err) {
      console.error("mp return error", err);
    }
  } else if (url.searchParams.get("status") === "null" || url.searchParams.get("collection_status") === "null") {
    // El usuario volvió sin pagar.
    outcome = "failed";
  }

  return NextResponse.redirect(`${url.origin}/?upgrade=${outcome}`, { status: 303 });
}
