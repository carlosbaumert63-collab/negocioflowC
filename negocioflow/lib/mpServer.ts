// Cliente server-side para Mercado Pago. Nunca importar desde código de
// navegador: usa la variable de entorno privada MP_ACCESS_TOKEN.

const MP_BASE_URL = "https://api.mercadopago.com";

function getToken(): string {
  const token = process.env.MP_ACCESS_TOKEN;
  if (!token) {
    throw new Error("Mercado Pago no está configurado: falta MP_ACCESS_TOKEN en el entorno.");
  }
  return token;
}

export async function mpCreatePreference(params: {
  externalReference: string;
  title: string;
  amount: number;
  payerEmail: string;
  backUrl: string;
  notificationUrl: string;
}): Promise<{ id: string; init_point: string }> {
  const res = await fetch(`${MP_BASE_URL}/checkout/preferences`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${getToken()}`,
    },
    body: JSON.stringify({
      items: [
        {
          title: params.title,
          quantity: 1,
          currency_id: "CLP",
          unit_price: Math.round(params.amount),
        },
      ],
      payer: { email: params.payerEmail },
      external_reference: params.externalReference,
      back_urls: {
        success: params.backUrl,
        pending: params.backUrl,
        failure: params.backUrl,
      },
      auto_return: "approved",
      notification_url: params.notificationUrl,
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Error al comunicarse con Mercado Pago.");
  }
  return { id: data.id, init_point: data.init_point };
}

export async function mpGetPayment(paymentId: string): Promise<any> {
  const res = await fetch(`${MP_BASE_URL}/v1/payments/${paymentId}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.message || "Error al consultar el pago en Mercado Pago.");
  }
  return data;
}
