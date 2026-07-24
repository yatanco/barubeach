import type { APIRoute } from 'astro';
import { formString, nowIso, redirectBack, requireDb } from '../../../../../lib/db';
import { isOneOf, QUOTE_CURRENCIES } from '../../../../../lib/crm';

export const prerender = false;

function parseAmount(value: string): number | null {
  if (!value.trim()) return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
}

export const POST: APIRoute = async ({ request, locals, params }) => {
  if (!params.id) return new Response('Missing lead id', { status: 422 });

  const form = await request.formData();
  const transportIncluded = formString(form, 'transport_included') === '1' ? 1 : 0;
  const foodIncluded = formString(form, 'food_included') === '1' ? 1 : 0;
  const currencyRaw = formString(form, 'quote_currency');
  const currency = isOneOf(currencyRaw, QUOTE_CURRENCIES) ? currencyRaw : 'USD';
  const accommodation = parseAmount(formString(form, 'quote_accommodation'));
  const transport = transportIncluded ? parseAmount(formString(form, 'quote_transport')) : null;
  const food = foodIncluded ? parseAmount(formString(form, 'quote_food')) : null;
  const total = parseAmount(formString(form, 'quote_total'));
  const deposit = parseAmount(formString(form, 'quote_deposit'));

  if (accommodation === null || total === null || deposit === null
    || (transportIncluded && transport === null) || (foodIncluded && food === null)) {
    return redirectBack(request, `/admin/leads/${params.id}`, { leadError: 'Quote fields must be valid numbers.' });
  }

  await requireDb(locals).prepare(`UPDATE leads SET
      transport_included = ?1, food_included = ?2, quote_accommodation = ?3, quote_transport = ?4,
      quote_food = ?5, quote_total = ?6, quote_deposit = ?7, quote_currency = ?8, quote_saved_at = ?9, updated_at = ?9
    WHERE id = ?10`)
    .bind(transportIncluded, foodIncluded, accommodation, transport, food, total, deposit, currency, nowIso(), params.id)
    .run();

  return redirectBack(request, `/admin/leads/${params.id}`, { saved: '1' });
};
