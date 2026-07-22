import type { APIRoute } from 'astro';
import { formString, nowIso, parseCopToCents, redirectBack, requireDb } from '../../../../../lib/db';
export const prerender = false;
export const POST: APIRoute = async ({ request, locals, params }) => {
  const form = await request.formData();
  if (!params.id) return new Response('Invalid charge', { status: 422 });
  const db = requireDb(locals);
  const amount = parseCopToCents(formString(form,'amount'));
  const charge = await db.prepare(`SELECT c.amount_cents - COALESCE(SUM(p.amount_cents), 0) AS balance
    FROM charges c LEFT JOIN payments p ON p.charge_id = c.id WHERE c.id = ?1 GROUP BY c.id`).bind(params.id).first<{ balance: number }>();
  if (!charge || amount > charge.balance) return new Response('Payment exceeds outstanding balance', { status: 422 });
  const now = nowIso();
  await db.prepare(`INSERT INTO payments (id,charge_id,created_at,paid_at,amount_cents,method,reference,notes)
    VALUES (?1,?2,?3,?3,?4,?5,?6,?7)`).bind(crypto.randomUUID(), params.id, now, amount, formString(form,'method') || null, formString(form,'reference') || null, formString(form,'notes') || null).run();
  return redirectBack(request, '/admin', { saved:'1' });
};
