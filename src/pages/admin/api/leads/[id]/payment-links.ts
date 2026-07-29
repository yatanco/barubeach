import type { APIRoute } from 'astro';
import { getRuntimeEnv, nowIso, requireDb } from '../../../../../lib/db';
import { isOneOf, PAYMENT_LINK_PROVIDERS } from '../../../../../lib/crm';
import { createBoldLink, createWompiLink } from '../../../../../lib/payment-providers';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid lead' }, { status: 422 });
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
    const result = provider === 'bold'
      ? await (async () => {
          if (!env.BOLD_API_KEY) throw new Error('Bold is not configured');
          return createBoldLink(env.BOLD_API_KEY, `CG-${params.id}`, amountCop, description);
        })()
      : await (async () => {
          if (!env.WOMPI_PRIVATE_KEY) throw new Error('Wompi is not configured');
          return createWompiLink(env.WOMPI_PRIVATE_KEY, amountCents, description);
        })();

    const id = crypto.randomUUID();
    const now = nowIso();
    await db.batch([
      db.prepare(`INSERT INTO payment_links (id,lead_id,charge_description,amount_cents,provider,link_id,url,status,created_at,expires_at)
        VALUES (?1,?2,?3,?4,?5,?6,?7,'active',?8,?9)`)
        .bind(id, params.id, description, amountCents, provider, result.linkId, result.url, now, result.expiresAt),
      db.prepare(`UPDATE leads SET status = 'deposit_pending', updated_at = ?1 WHERE id = ?2 AND status NOT IN ('booked', 'completed', 'lost', 'spam')`)
        .bind(now, params.id),
    ]);

    return Response.json({ success: true, url: result.url, provider });
  } catch (cause) {
    console.error('[admin] lead payment link creation failed', cause);
    const providerLabel = provider === 'bold' ? 'Bold' : 'Wompi';
    const otherLabel = provider === 'bold' ? 'Wompi' : 'Bold';
    return Response.json({ success: false, error: `${providerLabel} unavailable — use ${otherLabel}` }, { status: 502 });
  }
};
