import type { RuntimeEnv } from './db';

const PIXEL_ID_FALLBACK = '1039533654806987';
const CAPI_VERSION = 'v21.0';

export async function sha256Hex(value: string): Promise<string> {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Meta wants digits only (country code included, no leading +) before hashing.
export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, '');
}

export interface CapiLeadInput {
  eventId: string;
  eventSourceUrl: string;
  email?: string | null;
  phone?: string | null;
  clientIp?: string | null;
  userAgent?: string | null;
  fbp?: string | null;
  fbc?: string | null;
}

// Forwards the Lead event server-side via Meta's Conversions API, using the same
// event_id as the browser pixel's fbq() call so Meta dedupes them — this only ADDS
// signal (recovers events the browser pixel drops to ad blockers/iOS ITP, improves
// Event Match Quality) rather than double-counting. Never let a failure here break
// lead capture: no-ops silently if the access token isn't configured, and swallows
// network errors.
export async function sendCapiLead(env: RuntimeEnv, input: CapiLeadInput): Promise<void> {
  const accessToken = env.META_CAPI_ACCESS_TOKEN;
  if (!accessToken) return;

  const pixelId = import.meta.env.PUBLIC_META_PIXEL_ID ?? PIXEL_ID_FALLBACK;

  const userData: Record<string, unknown> = {};
  if (input.email) userData.em = [await sha256Hex(normalizeEmail(input.email))];
  const normalizedPhone = input.phone ? normalizePhone(input.phone) : '';
  if (normalizedPhone) userData.ph = [await sha256Hex(normalizedPhone)];
  if (input.clientIp) userData.client_ip_address = input.clientIp;
  if (input.userAgent) userData.client_user_agent = input.userAgent;
  if (input.fbp) userData.fbp = input.fbp;
  if (input.fbc) userData.fbc = input.fbc;

  const body = {
    data: [{
      event_name: 'Lead',
      event_time: Math.floor(Date.now() / 1000),
      event_id: input.eventId,
      event_source_url: input.eventSourceUrl,
      action_source: 'website',
      user_data: userData,
    }],
  };

  try {
    await fetch(`https://graph.facebook.com/${CAPI_VERSION}/${pixelId}/events?access_token=${accessToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error('[metaCapi] send failed', error);
  }
}
