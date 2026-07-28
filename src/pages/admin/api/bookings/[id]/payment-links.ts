import type { APIRoute } from 'astro';
import { getRuntimeEnv, nowIso, requireDb } from '../../../../../lib/db';
import { isOneOf, PAYMENT_LINK_PROVIDERS } from '../../../../../lib/crm';

export const prerender = false;

const BOLD_ENDPOINT = 'https://integrations.api.bold.co/online/link/v1';
const WOMPI_ENDPOINT = 'https://api.wompi.co/v1/payment_links';
const CONFIRM_URL = 'https://casagaviota.com/booking/confirm';

interface LinkResult {
  url: string;
  linkId: string | null;
  expiresAt: string;
}

async function createBoldLink(apiKey: string, bookingId: string, amountCop: number, description: string): Promise<LinkResult> {
  const nowNs = Date.now() * 1e6;
  const expirationNs = nowNs + 72 * 60 * 60 * 1e9;
  const res = await fetch(BOLD_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `x-api-key ${apiKey}` },
    body: JSON.stringify({
      amount_type: 'CLOSE',
      amount: { currency: 'COP', total_amount: amountCop, tip_amount: 0 },
      description,
      reference: `CG-${bookingId}-${Date.now()}`,
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

async function createWompiLink(privateKey: string, amountCents: number, description: string): Promise<LinkResult> {
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

export const POST: APIRoute = async ({ request, locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid booking' }, { status: 422 });
  const db = requireDb(locals);
  const env = getRuntimeEnv(locals);

  let body: { provider?: string; amount?: number; description?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const provider = body.provider;
  const description = typeof body.description === 'string' ? body.description.trim() : '';
  const amountCop = Number(body.amount);

  if (!provider || !isOneOf(provider, PAYMENT_LINK_PROVIDERS) || !description || !Number.isFinite(amountCop) || amountCop <= 0) {
    return Response.json({ success: false, error: 'Invalid provider, description or amount' }, { status: 422 });
  }

  const amountCents = Math.round(amountCop * 100);

  try {
    let result: LinkResult;
    if (provider === 'bold') {
      if (!env.BOLD_API_KEY) throw new Error('Bold is not configured');
      result = await createBoldLink(env.BOLD_API_KEY, params.id, amountCop, description);
    } else {
      if (!env.WOMPI_PRIVATE_KEY) throw new Error('Wompi is not configured');
      result = await createWompiLink(env.WOMPI_PRIVATE_KEY, amountCents, description);
    }

    const id = crypto.randomUUID();
    await db.prepare(`INSERT INTO payment_links (id,booking_id,charge_description,amount_cents,provider,link_id,url,status,created_at,expires_at)
      VALUES (?1,?2,?3,?4,?5,?6,?7,'active',?8,?9)`)
      .bind(id, params.id, description, amountCents, provider, result.linkId, result.url, nowIso(), result.expiresAt)
      .run();

    return Response.json({ success: true, url: result.url, provider });
  } catch (cause) {
    console.error('[admin] payment link creation failed', cause);
    return Response.json({ success: false, error: 'Could not generate payment link. Check the provider configuration and try again.' }, { status: 502 });
  }
};
