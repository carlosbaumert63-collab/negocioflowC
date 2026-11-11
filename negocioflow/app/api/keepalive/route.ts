import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Supabase (plan gratis) pausa la base de datos tras varios días sin uso y la
// app deja de funcionar. Vercel llama a esta ruta una vez al día (vercel.json)
// para que siempre haya actividad. No expone ni modifica datos.
export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  if (!url || !anonKey) {
    return NextResponse.json({ ok: false, error: "missing_config" }, { status: 500 });
  }
  const supabase = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await supabase.rpc("keepalive");
  if (error) {
    return NextResponse.json({ ok: false, error: "db_unreachable" }, { status: 503 });
  }
  return NextResponse.json({ ok: true, at: data }, { headers: { "Cache-Control": "no-store" } });
}
