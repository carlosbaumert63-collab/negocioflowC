import { NextResponse } from "next/server";
import { prepareOrder, HttpError } from "../../../../lib/checkoutCommon";
import { mpCreatePreference } from "../../../../lib/mpServer";

export async function POST(request: Request) {
  try {
    const order = await prepareOrder(request, "mp");
    const origin = new URL(request.url).origin;

    const pref = await mpCreatePreference({
      externalReference: order.orderId,
      title: `NegocioFlow — ${order.planName}`,
      amount: order.amount,
      payerEmail: order.email,
      backUrl: `${origin}/api/mp/return`,
      notificationUrl: `${origin}/api/mp/webhook`,
    });

    return NextResponse.json({ url: pref.init_point });
  } catch (err: any) {
    const status = err instanceof HttpError ? err.status : 500;
    return NextResponse.json({ error: err.message || "Error inesperado." }, { status });
  }
}
