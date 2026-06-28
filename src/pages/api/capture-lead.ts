import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const data = await request.json();

    // Runtime secrets (wrangler secret put) are in locals.runtime.env on CF Pages.
    // Build-time / local .env vars are in import.meta.env.
    const webhookUrl =
      (locals as any).runtime?.env?.LEADS_WEBHOOK_URL ??
      import.meta.env.LEADS_WEBHOOK_URL;

    if (!webhookUrl) {
      console.warn('[capture-lead] LEADS_WEBHOOK_URL not set — lead dropped');
      return new Response(JSON.stringify({ success: false, error: 'not configured' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('[capture-lead] forwarding:', JSON.stringify(data));

    // Must await — CF Workers kill pending async work after the response returns.
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    console.log('[capture-lead] webhook status:', res.status);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('[capture-lead] error:', err);
    return new Response(JSON.stringify({ success: false }), {
      status: 200, // always 200 — never surface errors to the client
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
