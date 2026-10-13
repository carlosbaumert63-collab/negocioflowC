import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Qué medios de pago están configurados en el servidor (sin exponer claves). */
export async function GET() {
  const base = !!process.env.ACTIVATION_SECRET;
  return NextResponse.json({
    flow: base && !!process.env.FLOW_API_KEY && !!process.env.FLOW_SECRET_KEY,
    mp: base && !!process.env.MP_ACCESS_TOKEN,
  });
}
