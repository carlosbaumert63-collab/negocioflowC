import { NextResponse } from "next/server";
import { prepareOrder, HttpError } from "../../../../lib/checkoutCommon";
import { flowCreatePayment } from "../../../../lib/flowServer";

export async function POST(request: Request) {
  try {
    const order = await prepareOrder(request, "flow");
    const origin = new URL(request.url).origin;

    const payment = await flowCreatePayment({
      commerceOrder: order.orderId,
      subject: `NegocioFlow — ${order.planName}`,
      amount: order.amount,
      email: order.email,
      urlConfirmation: `${origin}/api/flow/webhook`,
      urlReturn: `${origin}/api/flow/return`,
    });

    return NextResponse.json({ url: payment.url });
  } catch (err: any) {
    const status = err instanceof HttpError ? err.status : 500;
    return NextResponse.json({ error: err.message || "Error inesperado." }, { status });
  }
}
