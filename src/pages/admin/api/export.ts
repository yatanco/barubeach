import type { APIRoute } from 'astro';
import { nowIso, requireDb } from '../../../lib/db';

export const prerender = false;

interface LeadRow {
  id: string; created_at: string; updated_at: string; status: string; source: string; language: string;
  experience_type: string; guest_name: string | null; whatsapp: string | null; email: string | null;
  date_from: string | null; date_to: string | null; adults: number; children: number;
  estimated_price: string | null; guest_intent: string | null; notes: string | null; page_url: string | null;
}

const COLUMNS: (keyof LeadRow)[] = [
  'id', 'created_at', 'updated_at', 'status', 'source', 'language', 'experience_type',
  'guest_name', 'whatsapp', 'email', 'date_from', 'date_to', 'adults', 'children',
  'estimated_price', 'guest_intent', 'notes', 'page_url',
];

function csvField(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export const GET: APIRoute = async ({ locals }) => {
  const db = requireDb(locals);
  const { results } = await db.prepare(
    `SELECT ${COLUMNS.join(', ')} FROM leads ORDER BY created_at DESC`,
  ).all<LeadRow>();

  const lines = [COLUMNS.join(',')];
  for (const row of results) {
    lines.push(COLUMNS.map((column) => csvField(row[column])).join(','));
  }
  const csv = lines.join('\r\n');
  const filename = `casagaviota-leads-${nowIso().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
};
