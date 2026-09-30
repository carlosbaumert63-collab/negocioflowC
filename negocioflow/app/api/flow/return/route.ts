import { NextResponse } from "next/server";

// Flow redirige aquí al usuario tras el pago (GET o POST según el caso).
// Esto es solo para la experiencia visual: la activación real de la
// suscripción ocurre en el webhook server-to-server, nunca aquí.
async function handle(request: Request) {
  const origin = new URL(request.url).origin;
  return NextResponse.redirect(`${origin}/?upgrade=pending`, { status: 303 });
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
