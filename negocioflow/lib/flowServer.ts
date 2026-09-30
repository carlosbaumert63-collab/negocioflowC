import crypto from "crypto";

// Cliente server-side para la API de Flow.cl. Nunca importar este archivo
// desde código que corra en el navegador: usa las variables de entorno
// privadas FLOW_API_KEY / FLOW_SECRET_KEY, configuradas en Vercel.

const FLOW_BASE_URL = process.env.FLOW_API_BASE_URL || "https://www.flow.cl/api";

function sign(params: Record<string, string>, secretKey: string): string {
  const keys = Object.keys(params).sort();
  const toSign = keys.map((k) => `${k}${params[k]}`).join("");
  return crypto.createHmac("sha256", secretKey).update(toSign).digest("hex");
}

export async function flowCall(
  endpoint: string,
  params: Record<string, string>,
  method: "GET" | "POST" = "POST"
): Promise<any> {
  const apiKey = process.env.FLOW_API_KEY;
  const secretKey = process.env.FLOW_SECRET_KEY;
  if (!apiKey || !secretKey) {
    throw new Error("Flow no está configurado: faltan FLOW_API_KEY / FLOW_SECRET_KEY en el entorno.");
  }

  const allParams: Record<string, string> = { ...params, apiKey };
  const s = sign(allParams, secretKey);
  const body = new URLSearchParams({ ...allParams, s });

  const url = `${FLOW_BASE_URL}${endpoint}`;
  const res = await fetch(
    method === "GET" ? `${url}?${body.toString()}` : url,
    method === "GET"
      ? { method: "GET" }
      : {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        }
  );

  const data = await res.json();
  if (!res.ok || data.code) {
    throw new Error(data.message || "Error al comunicarse con Flow.");
  }
  return data;
}

export async function flowCreatePayment(params: {
  commerceOrder: string;
  subject: string;
  amount: number;
  email: string;
  urlConfirmation: string;
  urlReturn: string;
}): Promise<{ url: string; token: string; flowOrder: number }> {
  const data = await flowCall("/payment/create", {
    commerceOrder: params.commerceOrder,
    subject: params.subject,
    currency: "CLP",
    amount: String(Math.round(params.amount)),
    email: params.email,
    urlConfirmation: params.urlConfirmation,
    urlReturn: params.urlReturn,
  });
  return { url: `${data.url}?token=${data.token}`, token: data.token, flowOrder: data.flowOrder };
}

export async function flowGetStatus(token: string): Promise<any> {
  return flowCall("/payment/getStatus", { token }, "GET");
}
