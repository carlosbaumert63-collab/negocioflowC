import { NextResponse } from "next/server";

// Mercado Pago redirige aquí al usuario tras el pago. Solo para la
// experiencia visual: la activación real ocurre en el webhook.
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/?upgrade=pending`, { status: 303 });
}
