import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function callerClient(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
  return createClient(url, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const businessId = body.businessId as string | undefined;
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    if (!businessId || !email) {
      return NextResponse.json({ error: "Falta el negocio o el correo." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Ese correo no parece válido." }, { status: 400 });
    }

    // 1) Verificamos que quien llama es efectivamente el DUEÑO de ese negocio
    // (no solo un miembro), usando su propia sesión (respeta RLS).
    const sb = callerClient(request);
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Tu sesión expiró. Vuelve a iniciar sesión." }, { status: 401 });

    if ((user.email || "").toLowerCase() === email) {
      return NextResponse.json({ error: "Ese es tu propio correo: ya eres el dueño del negocio." }, { status: 400 });
    }

    const { data: business } = await sb
      .from("businesses")
      .select("id, name")
      .eq("id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!business) {
      return NextResponse.json({ error: "Solo el dueño del negocio puede invitar a alguien." }, { status: 403 });
    }

    // 2) Para crear/invitar al usuario y agregarlo al equipo necesitamos la
    // service role key de Supabase (nunca la anon key), porque invitar
    // usuarios es una operación de administrador.
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
    if (!serviceKey) {
      console.error("team invite: falta SUPABASE_SERVICE_ROLE_KEY");
      return NextResponse.json(
        { error: "Invitar personas no está disponible en este momento. Intenta más tarde." },
        { status: 503 }
      );
    }
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    // ¿Ya tiene cuenta? (búsqueda directa por correo, sin listar usuarios)
    const { data: existingId, error: findErr } = await admin.rpc("find_user_id_by_email", { p_email: email });
    if (findErr) {
      console.error("team invite: find_user_id_by_email", findErr);
      return NextResponse.json({ error: "No se pudo verificar ese correo. Intenta de nuevo." }, { status: 500 });
    }

    let userId = (existingId as string | null) || null;
    const alreadyHadAccount = !!userId;

    if (!userId) {
      const origin = new URL(request.url).origin;
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: origin,
      });
      if (inviteError || !invited?.user?.id) {
        console.error("team invite: inviteUserByEmail", inviteError);
        return NextResponse.json(
          { error: "No se pudo enviar la invitación: " + (inviteError?.message || "error desconocido") },
          { status: 500 }
        );
      }
      userId = invited.user.id;
    }

    const { error: memberError } = await admin
      .from("business_members")
      .upsert(
        { business_id: businessId, user_id: userId, role: "vendedor", member_email: email },
        { onConflict: "business_id,user_id" }
      );
    if (memberError) {
      console.error("team invite: business_members upsert", memberError);
      return NextResponse.json({ error: "No se pudo agregar al equipo. Intenta de nuevo." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, alreadyHadAccount });
  } catch (err: any) {
    console.error("team invite error", err);
    return NextResponse.json({ error: "Error inesperado. Intenta de nuevo." }, { status: 500 });
  }
}
