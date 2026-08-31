import type { APIRoute } from 'astro';
import { nowIso, requireDb, getRuntimeEnv } from '../../../../../lib/db';
import { checkAvailability } from '../../../../../lib/crm-availability';
import { getPriceLabsQuote } from '../../../../../lib/pricelabs';
import { buildSalesSuggestionContext, buildSalesState, buildReplyGenerationSystemPrompt } from '../../../../../lib/sales-suggestion';
import { generateReply } from '../../../../../lib/anthropic-reply';
import { nightsBetween } from '../../../../../lib/crm';

export const prerender = false;

// Drafts a WhatsApp reply directly in the admin, reusing the exact same
// context-assembly logic as the lean "Copy reply request" prompt. Every
// generation is logged to reply_suggestions (sent or not) — see
// [id]/reply-suggestions/[suggestionId]/send.ts for the "Mark as sent" path,
// which is the only place anything gets marked as actually sent.
export const POST: APIRoute = async ({ locals, params }) => {
  if (!params.id) return Response.json({ success: false, error: 'Invalid lead' }, { status: 422 });
  const db = requireDb(locals);
  const env = getRuntimeEnv(locals);
  if (!env.ANTHROPIC_API_KEY) {
    return Response.json({ success: false, error: 'ANTHROPIC_API_KEY is not configured' }, { status: 503 });
  }

  const lead = await db.prepare('SELECT * FROM leads WHERE id = ?1').bind(params.id).first<Record<string, any>>();
  if (!lead) return Response.json({ success: false, error: 'Lead not found' }, { status: 404 });

  // Everything below touches D1/KV/external APIs — the client expects JSON
  // back no matter what, so an unguarded throw here (which would otherwise
  // surface as Astro/Cloudflare's HTML error page and break res.json() on
  // the client) must be caught and turned into a JSON error response.
  try {
    const nights = nightsBetween(lead.date_from, lead.date_to);
    const availability = await checkAvailability(db, lead.date_from, lead.date_to, 'lead', lead.id);
    const checkinISO = lead.date_from ? String(lead.date_from).slice(0, 10) : null;
    const checkoutISO = lead.date_to ? String(lead.date_to).slice(0, 10) : null;
    const priceLabsQuote = (checkinISO && checkoutISO && nights > 0) ? await getPriceLabsQuote(env, checkinISO, checkoutISO) : null;
    const linkedBooking = await db.prepare('SELECT id, status FROM bookings WHERE lead_id = ?1 LIMIT 1')
      .bind(lead.id).first<{ id: string; status: string }>();
    const paymentsResult = await db.prepare(
      `SELECT p.amount_cents FROM payments p JOIN charges c ON c.id = p.charge_id WHERE c.lead_id = ?1`,
    ).bind(lead.id).all<{ amount_cents: number }>();
    const paymentsReceivedCents = paymentsResult.results.reduce((sum, p) => sum + p.amount_cents, 0);

    const salesContext = buildSalesSuggestionContext({
      lead: { ...lead, nights }, availability, priceLabsQuote, paymentsReceivedCents, linkedBooking: linkedBooking ?? null,
    });
    const salesState = buildSalesState({ ...lead, nights }, salesContext);
    const systemPrompt = buildReplyGenerationSystemPrompt(salesContext, salesState);

    let generated;
    try {
      generated = await generateReply(env.ANTHROPIC_API_KEY, systemPrompt);
    } catch (error) {
      console.error('[generate-reply] Anthropic call failed', error);
      return Response.json({ success: false, error: 'Could not generate a reply right now' }, { status: 502 });
    }

    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO reply_suggestions (id, lead_id, sales_context, generated_reply, rationale, warnings, sent, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 0, ?7)`,
    ).bind(id, lead.id, JSON.stringify(salesContext), generated.reply, generated.rationale, JSON.stringify(generated.warnings), nowIso()).run();

    return Response.json({ success: true, id, reply: generated.reply, rationale: generated.rationale, warnings: generated.warnings });
  } catch (error) {
    console.error('[generate-reply] failed', error);
    return Response.json({ success: false, error: 'Could not generate a reply right now' }, { status: 500 });
  }
};
