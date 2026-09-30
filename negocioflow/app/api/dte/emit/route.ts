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
    if (!saleId) return NextResponse.json({ error: "Falta saleId." }, { status: 400 });

    const sb = supabaseForRequest(request);
    const {
      data: { user },
    } = await sb.auth.getUser();
    if (!user) return NextResponse.json({ error: "No autenticado." }, { status: 401 });

    const { data: business } = await sb.from("businesses").select("*").eq("user_id", user.id).maybeSingle();
    if (!business) return NextResponse.json({ error: "Negocio no encontrado." }, { status: 404 });

    const { data: sale } = await sb.from("sales").select("id, total").eq("id", saleId).maybeSingle();
    if (!sale) return NextResponse.json({ error: "Venta no encontrada." }, { status: 404 });

    // Se deja un registro "pending" siempre, sea cual sea el resultado, así
    // queda historial de los intentos de emisión (y de por qué fallaron).
    const { data: doc } = await sb
      .from("dte_documents")
      .insert({ business_id: business.id, sale_id: sale.id, tipo_dte: 39, status: "pending" })
      .select()
      .single();

    try {
      const result = await emitDte({
        businessTaxId: business.tax_id,
        businessLegalName: business.legal_name,
        tipoDte: 39,
        amount: Number(sale.total),
      });
      if (doc) {
        await sb
          .from("dte_documents")
          .update({ status: "issued", folio: result.folio, xml_url: result.xmlUrl, pdf_url: result.pdfUrl })
          .eq("id", doc.id);
      }
      return NextResponse.json({ ok: true, ...result });
    } catch (dteErr: any) {
      if (doc) {
        await sb.from("dte_documents").update({ status: "failed", error_message: dteErr.message }).eq("id", doc.id);
      }
      return NextResponse.json({ error: dteErr.message }, { status: 422 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Error inesperado." }, { status: 500 });
  }
}
