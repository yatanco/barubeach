const BOLD_ENDPOINT = 'https://integrations.api.bold.co/online/link/v1';
const WOMPI_ENDPOINT = 'https://api.wompi.co/v1/payment_links';
const CONFIRM_URL = 'https://casagaviota.com/booking/confirm';

export interface PaymentLinkResult {
  url: string;
  linkId: string | null;
  expiresAt: string;
}

export async function createBoldLink(apiKey: string, referencePrefix: string, amountCop: number, description: string): Promise<PaymentLinkResult> {
  const nowNs = Date.now() * 1e6;
  const expirationNs = nowNs + 72 * 60 * 60 * 1e9;
  const res = await fetch(BOLD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `x-api-key ${apiKey}` },
    body: JSON.stringify({
      amount_type: 'CLOSE',
      amount: { currency: 'COP', total_amount: amountCop, tip_amount: 0 },
      description,
      reference: `${referencePrefix}-${Date.now()}`,
      expiration_date: expirationNs,
      payment_methods: ['CREDIT_CARD', 'PSE', 'BOTON_BANCOLOMBIA', 'NEQUI'],
      callback_url: CONFIRM_URL,
    }),
  });
  if (!res.ok) throw new Error(`Bold API responded ${res.status}`);
  const payload = (await res.json()) as any;
  if (!payload?.payload?.url) throw new Error('Bold API response missing url');
  return {
    url: payload.payload.url,
    linkId: payload.payload.payment_link_id ?? payload.payload.id ?? null,
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
  };
}

export async function createWompiLink(privateKey: string, amountCents: number, description: string): Promise<PaymentLinkResult> {
  const res = await fetch(WOMPI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${privateKey}` },
    body: JSON.stringify({
      name: description,
      description,
      single_use: true,
      collect_shipping: false,
      amount_in_cents: amountCents,
      currency: 'COP',
      redirect_url: CONFIRM_URL,
    }),
  });
  if (!res.ok) throw new Error(`Wompi API responded ${res.status}`);
  const payload = (await res.json()) as any;
  if (!payload?.data?.url) throw new Error('Wompi API response missing url');
  return {
    url: payload.data.url,
    linkId: payload.data.id ?? null,
    expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
  };
}
