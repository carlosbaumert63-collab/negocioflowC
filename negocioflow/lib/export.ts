import { supabase } from "./supabaseClient";
import { fmtCLP, type Business, type Sale } from "./types";
import { monthRange, formatDateCL } from "./dates";

function downloadBlob(filename: string, content: BlobPart, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

// BOM + punto y coma: para que Excel en configuración regional chilena abra
// el CSV con acentos correctos y columnas bien separadas.
function toCSV(rows: (string | number)[][]): string {
  const lines = rows.map((row) =>
    row
      .map((cell) => {
        // Decimales con coma (p. ej. stock 2,5 kg), como los lee Excel en Chile.
        if (typeof cell === "number") return Number.isFinite(cell) ? String(cell).replace(".", ",") : "";
        let s = String(cell ?? "");
        // Protección contra "inyección de fórmulas": un texto que empieza con
        // = + - @ se ejecutaría como fórmula al abrir el archivo en Excel.
        if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
        if (s.includes(";") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      })
      .join(";")
  );
  return "\uFEFF" + lines.join("\r\n");
}

// La API devuelve como máximo 1.000 filas por consulta: se pide por páginas
// para que la exportación incluya TODO, no solo lo primero.
async function fetchAll<T>(build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: any }>): Promise<T[]> {
  const PAGE = 1000;
  const out: T[] = [];
  for (let from = 0; from < 200000; from += PAGE) {
    const { data, error } = await build(from, from + PAGE - 1);
    if (error) throw new Error(error.message || "No se pudieron leer los datos para exportar.");
    out.push(...(data || []));
    if (!data || data.length < PAGE) break;
  }
  return out;
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function exportSalesCSV(businessId: string) {
  const [sales, customers] = await Promise.all([
    fetchAll<any>((from, to) =>
      supabase
        .from("sales")
        .select("sale_date, payment_method, customer_id, pending_payment, subtotal, discount, total, cost_total, profit, sale_items(product_name, quantity)")
        .eq("business_id", businessId)
        .order("sale_date", { ascending: false })
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to)
    ),
    fetchAll<any>((from, to) => supabase.from("customers").select("id, name").eq("business_id", businessId).range(from, to)),
  ]);
  const customerName = new Map(customers.map((c: any) => [c.id, c.name]));

  const rows: (string | number)[][] = [
    ["Fecha", "Productos", "Cliente", "Método de pago", "Estado", "Subtotal", "Descuento", "Total", "Costo", "Ganancia"],
  ];
  sales.forEach((s: any) => {
    rows.push([
      formatDateCL(s.sale_date),
      (s.sale_items || []).map((i: any) => `${Number(i.quantity)}x ${i.product_name}`).join(", "),
      s.customer_id ? customerName.get(s.customer_id) || "" : "",
      s.payment_method,
      s.pending_payment ? "Fiado (pendiente)" : "Pagada",
      Number(s.subtotal),
      Number(s.discount),
      Number(s.total),
      Number(s.cost_total),
      Number(s.profit),
    ]);
  });
  downloadBlob(`ventas_${today()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
}

export async function exportExpensesCSV(businessId: string) {
  const data = await fetchAll<any>((from, to) =>
    supabase
      .from("expenses")
      .select("expense_date, description, category, amount, payment_method, note")
      .eq("business_id", businessId)
      .order("expense_date", { ascending: false })
      .order("id")
      .range(from, to)
  );

  const rows: (string | number)[][] = [["Fecha", "Descripción", "Categoría", "Monto", "Método de pago", "Nota"]];
  data.forEach((e: any) => {
    rows.push([formatDateCL(e.expense_date), e.description, e.category, Number(e.amount), e.payment_method, e.note || ""]);
  });
  downloadBlob(`gastos_${today()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
}

export async function exportProductsCSV(businessId: string) {
  const data = await fetchAll<any>((from, to) =>
    supabase
      .from("products")
      .select("name, sku, category, sale_price, cost, stock, min_stock")
      .eq("business_id", businessId)
      .order("name")
      .order("id")
      .range(from, to)
  );

  const rows: (string | number)[][] = [
    ["Nombre", "SKU", "Categoría", "Precio venta", "Costo", "Stock", "Stock mínimo", "Ganancia/u", "Margen %"],
  ];
  data.forEach((p: any) => {
    const gain = Number(p.sale_price) - Number(p.cost);
    const margin = Number(p.sale_price) > 0 ? (gain / Number(p.sale_price)) * 100 : 0;
    rows.push([
      p.name,
      p.sku || "",
      p.category || "",
      Number(p.sale_price),
      Number(p.cost),
      Number(p.stock),
      Number(p.min_stock),
      Math.round(gain),
      Number(margin.toFixed(1)),
    ]);
  });
  downloadBlob(`productos_${today()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
}

// Comprobante simple de una venta, NO es una boleta ni factura electrónica
// (eso requiere certificado digital y CAF del SII — ver lib/sii.ts). Sirve
// para entregarle algo en papel/PDF al cliente mientras tanto.
export async function exportSaleReceiptPDF(business: Business, sale: Sale) {
  const [{ default: jsPDF }] = await Promise.all([import("jspdf")]);
  await import("jspdf-autotable");

  const doc = new jsPDF();
  doc.setFontSize(15);
  doc.text(business.name, 14, 18);
  doc.setFontSize(10);
  doc.text(`Comprobante de venta · ${formatDateCL(sale.sale_date)}`, 14, 25);
  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text("Este documento no reemplaza una boleta o factura electrónica ante el SII.", 14, 31);
  doc.setTextColor(0);

  (doc as any).autoTable({
    startY: 37,
    head: [["Producto", "Cant.", "Precio unit.", "Subtotal"]],
    body: (sale.sale_items || []).map((i) => [
      i.product_name,
      String(Number(i.quantity)),
      fmtCLP(i.unit_price),
      fmtCLP(Math.round(i.unit_price * i.quantity)),
    ]),
    theme: "grid",
    headStyles: { fillColor: [5, 150, 105] },
  });

  let y = (doc as any).lastAutoTable.finalY + 8;
  doc.setFontSize(10);
  doc.text(`Subtotal: ${fmtCLP(sale.subtotal)}`, 14, y);
  y += 6;
  if (Number(sale.discount) > 0) {
    doc.text(`Descuento: -${fmtCLP(sale.discount)}`, 14, y);
    y += 6;
  }
  doc.setFontSize(13);
  doc.text(`Total: ${fmtCLP(sale.total)}`, 14, y);
  y += 8;
  doc.setFontSize(9);
  doc.setTextColor(100);
  doc.text(`Método de pago: ${sale.payment_method}`, 14, y);
  doc.setTextColor(0);

  doc.save(`comprobante_${sale.id.slice(0, 8)}.pdf`);
}

export async function exportMonthlyPDF(business: Business, offset = 0) {
  const [{ default: jsPDF }] = await Promise.all([import("jspdf")]);
  await import("jspdf-autotable");

  const { start, end, label } = monthRange(offset);

  // Totales calculados en la base de datos (sin tope de filas).
  const { data, error } = await supabase.rpc("report_summary", {
    p_business_id: business.id,
    p_since: start,
    p_until: end,
  });
  if (error) throw new Error(error.message);
  const r = data as any;

  const totalSales = Number(r.totals?.sales || 0);
  const totalCost = Number(r.totals?.cost || 0);
  const totalExpenses = Number(r.expenses_total || 0);
  const profit = totalSales - totalCost - totalExpenses;
  const margin = totalSales > 0 ? (profit / totalSales) * 100 : 0;
  const salesCount = Number(r.totals?.count || 0);

  const byCategory: [string, number][] = (r.expenses_by_category || []).map((c: any) => [c.name, Number(c.value)]);
  const topProducts: { name: string; sales: number; profit: number }[] = (r.top_products || []).map((p: any) => ({
    name: p.name,
    sales: Number(p.sales),
    profit: Number(p.profit),
  }));

  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("NegocioFlow — Reporte mensual", 14, 18);
  doc.setFontSize(11);
  doc.text(`${business.name} · ${label}`, 14, 26);

  (doc as any).autoTable({
    startY: 34,
    head: [["Concepto", "Monto"]],
    body: [
      ["Ventas", fmtCLP(totalSales)],
      ["N° de ventas", String(salesCount)],
      ["Costo de productos", fmtCLP(totalCost)],
      ["Gastos", fmtCLP(totalExpenses)],
      ["Ganancia neta", fmtCLP(profit)],
      ["Margen", `${margin.toFixed(1).replace(".", ",")}%`],
    ],
    theme: "grid",
    headStyles: { fillColor: [5, 150, 105] },
  });

  let nextY = (doc as any).lastAutoTable.finalY + 10;

  if (topProducts.length) {
    doc.setFontSize(12);
    doc.text("Productos más rentables", 14, nextY);
    (doc as any).autoTable({
      startY: nextY + 4,
      head: [["Producto", "Ventas", "Ganancia"]],
      body: topProducts.map((p) => [p.name, fmtCLP(p.sales), fmtCLP(p.profit)]),
      theme: "striped",
      headStyles: { fillColor: [5, 150, 105] },
    });
    nextY = (doc as any).lastAutoTable.finalY + 10;
  }

  if (byCategory.length) {
    doc.setFontSize(12);
    doc.text("Gastos por categoría", 14, nextY);
    (doc as any).autoTable({
      startY: nextY + 4,
      head: [["Categoría", "Monto"]],
      body: byCategory.map(([cat, amt]) => [cat, fmtCLP(amt)]),
      theme: "striped",
      headStyles: { fillColor: [5, 150, 105] },
    });
  }

  doc.setFontSize(8);
  doc.setTextColor(140);
  doc.text(`Generado el ${formatDateCL(today())} con NegocioFlow. No reemplaza la contabilidad formal.`, 14, 287);
  doc.setTextColor(0);

  doc.save(`reporte_${label.replace(" ", "_")}.pdf`);
}
