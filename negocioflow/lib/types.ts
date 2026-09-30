export interface Business {
  id: string;
  user_id: string;
  name: string;
  business_type: string;
  currency: string;
  main_sale_method: string;
  has_inventory: boolean;
  onboarding_completed: boolean;
  tax_id?: string | null;
  legal_name?: string | null;
  legal_address?: string | null;
  monthly_sales_goal?: number | null;
}

export type BusinessRole = "owner" | "vendedor";

export interface BusinessMember {
  business_id: string;
  user_id: string;
  role: "vendedor";
  created_at: string;
  member_email?: string | null;
}

export interface CashRegister {
  id: string;
  business_id: string;
  opening_amount: number;
  opened_at: string;
  closed_at: string | null;
  expected_amount: number | null;
  counted_amount: number | null;
  difference: number | null;
  status: "open" | "closed";
  notes: string | null;
  is_demo?: boolean;
  created_at: string;
}

export interface DteDocument {
  id: string;
  business_id: string;
  sale_id: string | null;
  tipo_dte: number;
  folio: number | null;
  status: "pending" | "issued" | "failed";
  error_message: string | null;
  xml_url: string | null;
  pdf_url: string | null;
  created_at: string;
}

export interface Product {
  id: string;
  business_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  sale_price: number;
  cost: number;
  stock: number;
  min_stock: number;
  supplier_id: string | null;
  is_demo?: boolean;
}

export interface SaleItem {
  id?: string;
  sale_id?: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
}

export interface Sale {
  id: string;
  business_id: string;
  sale_date: string;
  payment_method: string;
  customer_id: string | null;
  subtotal: number;
  discount: number;
  total: number;
  cost_total: number;
  profit: number;
  created_at: string;
  sale_items?: SaleItem[];
  is_demo?: boolean;
  pending_payment?: boolean;
}

export interface Expense {
  id: string;
  business_id: string;
  description: string;
  category: string;
  amount: number;
  expense_date: string;
  payment_method: string;
  note: string | null;
  is_demo?: boolean;
}

export interface Customer {
  id: string;
  business_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

export interface Supplier {
  id: string;
  business_id: string;
  name: string;
  contact: string | null;
  phone: string | null;
  email: string | null;
  created_at: string;
}

export interface PurchaseItem {
  id?: string;
  purchase_id?: string;
  product_id: string | null;
  product_name?: string;
  quantity: number;
  unit_cost: number;
}

export interface Purchase {
  id: string;
  business_id: string;
  supplier_id: string | null;
  purchase_date: string;
  total: number;
  created_at: string;
  purchase_items?: PurchaseItem[];
}

export interface Subscription {
  business_id: string;
  plan: string;
  status: "active" | "trialing" | "canceled" | "expired";
  flow_customer_id: string | null;
  expires_at: string | null;
  updated_at: string;
}

export const BUSINESS_TYPES = [
  "Tienda",
  "Minimarket",
  "Restaurante",
  "Cafetería",
  "Ropa",
  "Servicios",
  "Emprendimiento online",
  "Otro",
];

export const PAYMENT_METHODS = ["efectivo", "débito", "crédito", "transferencia", "otro"];

export const EXPENSE_CATEGORIES = [
  "arriendo",
  "servicios",
  "publicidad",
  "transporte",
  "proveedores",
  "sueldos",
  "software",
  "impuestos",
  "otros",
];

export function fmtCLP(n: number): string {
  return new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
  }).format(n || 0);
}
