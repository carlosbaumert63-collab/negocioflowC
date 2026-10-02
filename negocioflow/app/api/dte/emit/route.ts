import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { emitDte } from "../../../../lib/sii";

function supabaseForRequest(request: Request) {
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
    const saleId = body.saleId as string | undefined;
    const businessId = body.businessId as string | undefined;
    if (!saleId || !businessId) return NextResponse.json({ error: "Falta la venta o el negocio." }, { status: 400 });

    const sb = supabaseForRequest(request);
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "Tu sesión expiró. Vuelve a iniciar sesión." }, { status: 401 });

    // El usuario puede tener varios negocios: usamos el indicado y verificamos
    // que sea suyo (la boleta sale con el RUT de ESE negocio).
    const { data: business } = await sb
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (!business) {
      return NextResponse.json({ error: "Solo el dueño del negocio puede emitir boletas." }, { status: 403 });
    }

    const { data: sale } = await sb
      .from("sales")
      .select("id, total")
      .eq("id", saleId)
      .eq("business_id", business.id)
      .maybeSingle();
    if (!sale) return NextResponse.json({ error: "Venta no encontrada en este negocio." }, { status: 404 });

    const { data: issued } = await sb
      .from("dte_documents")
      .select("id, folio")
      .eq("sale_id", sale.id)
      .eq("status", "issued")
      .maybeSingle();
    if (issued) {
      return NextResponse.json({ error: `Esta venta ya tiene una boleta emitida (folio ${issued.folio ?? "—"}).` }, { status: 409 });
    }

    try {
      const result = await emitDte({
        businessTaxId: business.tax_id,
        businessLegalName: business.legal_name,
        tipoDte: 39,
        amount: Number(sale.total),
      });
      // Solo se registra el documento cuando el SII lo aceptó.
      const { error: docErr } = await sb.from("dte_documents").insert({
        business_id: business.id,
        sale_id: sale.id,
        tipo_dte: 39,
        status: "issued",
        folio: result.folio,
        xml_url: result.xmlUrl,
        pdf_url: result.pdfUrl,
      });
      if (docErr) {
        // La boleta YA fue aceptada por el SII: no se debe reintentar la emisión.
        console.error("dte emit: boleta emitida pero no registrada", { saleId: sale.id, folio: result.folio, docErr });
        return NextResponse.json(
          {
            ok: true,
            ...result,
            warning: `Boleta emitida (folio ${result.folio}), pero no se pudo guardar en el historial. No la vuelvas a emitir; anota el folio.`,
          },
          { status: 200 }
        );
      }
      return NextResponse.json({ ok: true, ...result });
    } catch (dteErr: any) {
      return NextResponse.json({ error: dteErr.message }, { status: 422 });
    }
  } catch (err: any) {
    console.error("dte emit error", err);
    return NextResponse.json({ error: "Error inesperado. Intenta de nuevo." }, { status: 500 });
  }
}
