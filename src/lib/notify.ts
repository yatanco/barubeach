import type { RuntimeEnv } from './db';

// Pings the operator via a Telegram bot whenever a new lead lands in D1 — including
// leads that picked "no WhatsApp, email instead" and would otherwise never trigger
// any message on the operator's phone. Free, no capacity limits, no business account.
// Telegram (not WhatsApp) because there's no free way to send an unprompted WhatsApp
// message without a paid, approval-gated Business API. Never let a failure here break
// lead capture.
export async function notifyNewLead(
  env: RuntimeEnv,
  lead: { id: string; name: string | null; phone: string | null; email: string | null; dateFrom: string | null; dateTo: string | null; source: string },
): Promise<void> {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = env;
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

  const contact = lead.phone ? `📱 ${lead.phone}` : lead.email ? `✉️ ${lead.email} (no WhatsApp)` : 'no contact info';
  const dates = lead.dateFrom && lead.dateTo ? `${lead.dateFrom} → ${lead.dateTo}` : 'no dates yet';
  const text = [
    '🆕 New Casa Gaviota lead',
    lead.name || 'Unnamed',
    contact,
    dates,
    `via ${lead.source}`,
    `https://casagaviota.com/admin/leads/${lead.id}`,
  ].join('\n');

  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

  try {
    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text }),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error('[notify] Telegram lead notification failed', error);
  }
}
