import { NextResponse } from "next/server";
import { flowGetStatus } from "../../../../lib/flowServer";
import { confirmOrder, type PaymentOutcome } from "../../../../lib/checkoutCommon";

// Flow redirige aquí al usuario tras el pago (normalmente un POST con `token`).
// Consultamos el estado real a Flow para mostrarle el resultado correcto, y si
// el pago está aprobado lo confirmamos también aquí: así el usuario queda
// activado aunque el webhook se haya demorado o fallado. Es seguro hacerlo dos
// veces porque la confirmación es idempotente en la base de datos.
async function handle(request: Request, token: string | null) {
  const origin = new URL(request.url).origin;
  let outcome: PaymentOutcome = "pending";
  if (token) {
    try {
      const status = await flowGetStatus(token);
      if (status.status === 2 && status.commerceOrder && (!status.currency || status.currency === "CLP")) {
        await confirmOrder(status.commerceOrder, Number(status.amount));
        outcome = "success";
      } else if (status.status === 3 || status.status === 4) {
        // 3 = rechazado, 4 = anulado
        outcome = "failed";
      }
    } catch (err) {
      console.error("flow return error", err);
    }
  }
  return NextResponse.redirect(`${origin}/?upgrade=${outcome}`, { status: 303 });
}

export async function GET(request: Request) {
  return handle(request, new URL(request.url).searchParams.get("token"));
}

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const token = (form?.get("token") as string | null) || new URL(request.url).searchParams.get("token");
  return handle(request, token);
}
