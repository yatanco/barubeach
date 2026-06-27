import type { APIContext } from 'astro';

export const prerender = false;

interface Env {
  LEADS_WEBHOOK_URL?: string;
}

function getCFEnv(locals: APIContext['locals']): Env {
  return (locals as any).runtime?.env ?? {};
}

export async function POST({ request, locals }: APIContext) {
  try {
    const data = await request.json();

    const cfEnv = getCFEnv(locals);
    const webhookUrl = cfEnv.LEADS_WEBHOOK_URL ?? import.meta.env.LEADS_WEBHOOK_URL;

    if (webhookUrl) {
      // Fire and forget — don't block the response waiting for Google Sheets
      (async () => {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });
        } catch (err) {
          console.error('[capture-lead] webhook error:', err);
        }
      })();
    }

    return new Response('OK', { status: 200 });
  } catch (err) {
    console.error('[capture-lead]', err);
    return new Response('OK', { status: 200 }); // always 200 — never block the user
  }
}
