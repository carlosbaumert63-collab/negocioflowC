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
        const s = String(cell ?? "");
        if (s.includes(";") || s.includes('"') || s.includes("\n")) {
          return `"${s.replace(/"/g, '""')}"`;
        }
        return s;
      })
      .join(";")
  );
  return "﻿" + lines.join("\n");
}

export async function exportSalesCSV(businessId: string) {
  const { data } = await supabase
    .from("sales")
    .select("sale_date, payment_method, subtotal, discount, total, cost_total, profit")
    .eq("business_id", businessId)
    .order("sale_date", { ascending: false });

  const rows: (string | number)[][] = [
    ["Fecha", "Método de pago", "Subtotal", "Descuento", "Total", "Costo", "Ganancia"],
  ];
  (data || []).forEach((s: any) => {
    rows.push([
      formatDateCL(s.sale_date),
      s.payment_method,
      s.subtotal,
      s.discount,
      s.total,
      s.cost_total,
      s.profit,
    ]);
  });
  downloadBlob(`ventas_${Date.now()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
}

export async function exportExpensesCSV(businessId: string) {
  const { data } = await supabase
    .from("expenses")
    .select("expense_date, description, category, amount, payment_method, note")
    .eq("business_id", businessId)
    .order("expense_date", { ascending: false });

  const rows: (string | number)[][] = [
    ["Fecha", "Descripción", "Categoría", "Monto", "Método de pago", "Nota"],
  ];
  (data || []).forEach((e: any) => {
    rows.push([formatDateCL(e.expense_date), e.description, e.category, e.amount, e.payment_method, e.note || ""]);
  });
  downloadBlob(`gastos_${Date.now()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
}

export async function exportProductsCSV(businessId: string) {
  const { data } = await supabase
    .from("products")
    .select("name, sku, category, sale_price, cost, stock, min_stock")
    .eq("business_id", businessId)
    .order("name");

  const rows: (string | number)[][] = [
    ["Nombre", "SKU", "Categoría", "Precio venta", "Costo", "Stock", "Stock mínimo", "Ganancia/u", "Margen %"],
  ];
  (data || []).forEach((p: any) => {
    const gain = Number(p.sale_price) - Number(p.cost);
    const margin = Number(p.sale_price) > 0 ? (gain / Number(p.sale_price)) * 100 : 0;
    rows.push([
      p.name,
      p.sku || "",
      p.category || "",
      p.sale_price,
      p.cost,
      p.stock,
      p.min_stock,
      gain.toFixed(0),
      margin.toFixed(1),
    ]);
  });
  downloadBlob(`productos_${Date.now()}.csv`, toCSV(rows), "text/csv;charset=utf-8");
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
      String(i.quantity),
      fmtCLP(i.unit_price),
      fmtCLP(i.unit_price * i.quantity),
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

  const [salesRes, expensesRes, itemsRes] = await Promise.all([
    supabase
      .from("sales")
      .select("total, cost_total, profit")
      .eq("business_id", business.id)
      .gte("sale_date", start)
      .lte("sale_date", end),
    supabase
      .from("expenses")
      .select("category, amount")
      .eq("business_id", business.id)
      .gte("expense_date", start)
      .lte("expense_date", end),
    supabase
      .from("sale_items")
      .select("product_name, quantity, unit_price, unit_cost, sales!inner(business_id, sale_date)")
      .eq("sales.business_id", business.id)
      .gte("sales.sale_date", start)
      .lte("sales.sale_date", end),
  ]);

  const sales = salesRes.data || [];
  const expenses = expensesRes.data || [];
  const items = itemsRes.data || [];

  const totalSales = sales.reduce((s: number, r: any) => s + Number(r.total), 0);
  const totalCost = sales.reduce((s: number, r: any) => s + Number(r.cost_total), 0);
  const totalExpenses = expenses.reduce((s: number, r: any) => s + Number(r.amount), 0);
  const profit = totalSales - totalCost - totalExpenses;
  const margin = totalSales > 0 ? (profit / totalSales) * 100 : 0;

  const byCategory = new Map<string, number>();
  expenses.forEach((e: any) => byCategory.set(e.category, (byCategory.get(e.category) || 0) + Number(e.amount)));

  const byProduct = new Map<string, { sales: number; profit: number }>();
  items.forEach((i: any) => {
    const s = Number(i.unit_price) * Number(i.quantity);
    const p = (Number(i.unit_price) - Number(i.unit_cost)) * Number(i.quantity);
    const cur = byProduct.get(i.product_name) || { sales: 0, profit: 0 };
    byProduct.set(i.product_name, { sales: cur.sales + s, profit: cur.profit + p });
  });
  const topProducts = Array.from(byProduct.entries())
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.profit - a.profit)
    .slice(0, 10);

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
      ["Costo de productos", fmtCLP(totalCost)],
      ["Gastos", fmtCLP(totalExpenses)],
      ["Ganancia neta", fmtCLP(profit)],
      ["Margen", `${margin.toFixed(1)}%`],
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

  if (byCategory.size) {
    doc.setFontSize(12);
    doc.text("Gastos por categoría", 14, nextY);
    (doc as any).autoTable({
      startY: nextY + 4,
      head: [["Categoría", "Monto"]],
      body: Array.from(byCategory.entries()).map(([cat, amt]) => [cat, fmtCLP(amt)]),
      theme: "striped",
      headStyles: { fillColor: [5, 150, 105] },
    });
  }

  doc.save(`reporte_${label.replace(" ", "_")}.pdf`);
}
