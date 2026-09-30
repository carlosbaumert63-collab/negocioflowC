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

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const businessId = body.businessId as string | undefined;
    const email = (body.email as string | undefined)?.trim().toLowerCase();
    if (!businessId || !email) {
      return NextResponse.json({ error: "Falta el negocio o el correo." }, { status: 400 });
    }

    // 1) Verificamos que quien llama es efectivamente el DUEÑO de ese negocio
    // (no solo un miembro), usando su propia sesión (respeta RLS).
    const sb = callerClient(request);
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

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
      return NextResponse.json(
        {
          error:
            "Invitar personas no está configurado todavía: falta la variable de entorno SUPABASE_SERVICE_ROLE_KEY (Supabase → Project Settings → API → service_role key) en Vercel.",
        },
        { status: 501 }
      );
    }
    const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email);
    let userId = invited?.user?.id;

    if (inviteError) {
      const alreadyExists = /already.*registered|already.*exists/i.test(inviteError.message || "");
      if (!alreadyExists) {
        return NextResponse.json({ error: "No se pudo invitar: " + inviteError.message }, { status: 500 });
      }
      // Ya existe una cuenta con ese correo: buscamos su ID entre los usuarios.
      const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 });
      const existing = list?.users?.find((u: any) => (u.email || "").toLowerCase() === email);
      if (!existing) {
        return NextResponse.json(
          { error: "Ese correo ya tiene una cuenta, pero no pudimos encontrarla para agregarla al equipo." },
          { status: 409 }
        );
      }
      userId = existing.id;
    }

    if (!userId) {
      return NextResponse.json({ error: "No se pudo obtener el usuario invitado." }, { status: 500 });
    }

    const { error: memberError } = await admin
      .from("business_members")
      .upsert({ business_id: businessId, user_id: userId, role: "vendedor", member_email: email });
    if (memberError) {
      return NextResponse.json({ error: "No se pudo agregar al equipo: " + memberError.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error inesperado." }, { status: 500 });
  }
}
