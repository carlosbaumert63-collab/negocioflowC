import { NextResponse } from "next/server";
import { flowGetStatus } from "../../../../lib/flowServer";
import { confirmOrder } from "../../../../lib/checkoutCommon";

// Flow llama a esta URL server-to-server tras el pago. Nunca confiamos en el
// redirect del navegador: siempre se vuelve a consultar el estado a la API
// de Flow usando el token recibido antes de activar la suscripción.
export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const token = form.get("token") as string | null;
    if (!token) {
      return NextResponse.json({ error: "Falta token." }, { status: 400 });
    }

    const status = await flowGetStatus(token);
    // status 2 = pagado en la API de Flow
    if (status.status === 2 && status.commerceOrder) {
      await confirmOrder(status.commerceOrder);
    }

    return new NextResponse("OK", { status: 200 });
  } catch (err: any) {
    console.error("flow webhook error", err);
    return NextResponse.json({ error: err.message || "Error inesperado." }, { status: 500 });
  }
}
