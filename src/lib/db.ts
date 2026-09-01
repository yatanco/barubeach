import type { APIContext, APIRoute } from 'astro';

export interface D1Result<T = Record<string, unknown>> {
  success: boolean;
  results: T[];
  meta?: Record<string, unknown>;
}

export interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  run<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
}

export interface D1Database {
  prepare(query: string): D1PreparedStatement;
  batch<T = Record<string, unknown>>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}

interface KVNamespace {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

interface RuntimeEnv {
  DB?: D1Database;
  CACHE?: KVNamespace;
  LEADS_WEBHOOK_URL?: string;
  HOSTHUB_API_KEY?: string;
  HOSTHUB_RENTAL_ID?: string;
  HOSTHUB_BASE_URL?: string;
  HOSTHUB_ICAL_URL?: string;
  BOLD_PAYMENT_LINK?: string;
  PRICELABS_API_KEY?: string;
  PRICELABS_LISTING_ID?: string;
  PRICELABS_PMS?: string;
  ANTHROPIC_API_KEY?: string;
  OPENAI_API_KEY?: string;
  OPENAI_MODEL?: string;
}

// Evergreen Bold checkout link (lets the guest enter their own amount) — falls back to
// the known-good production link if the BOLD_PAYMENT_LINK secret isn't set locally.
export const DEFAULT_BOLD_PAYMENT_LINK = 'https://checkout.bold.co/payment/LNK_XG0X5VREON';

export function boldPaymentLink(env: RuntimeEnv): string {
  return env.BOLD_PAYMENT_LINK ?? DEFAULT_BOLD_PAYMENT_LINK;
}

export function getRuntimeEnv(locals: APIContext['locals']): RuntimeEnv {
  return (locals as any).runtime?.env ?? {};
}

export function getDb(locals: APIContext['locals']): D1Database | null {
  return getRuntimeEnv(locals).DB ?? null;
}

export function requireDb(locals: APIContext['locals']): D1Database {
  const db = getDb(locals);
  if (!db) throw new Error('D1 binding DB is not configured');
  return db;
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function formString(form: FormData, key: string): string {
  const value = form.get(key);
  return typeof value === 'string' ? value.trim() : '';
}

export function parseCopToCents(value: string): number {
  const normalized = value.replace(/[^0-9]/g, '');
  const pesos = Number.parseInt(normalized, 10);
  if (!Number.isFinite(pesos) || pesos < 0) throw new Error('Invalid amount');
  return pesos * 100;
}

// Every /admin/api JSON route is consumed via fetch(...).then(r => r.json())
// from admin-page client JS. With no middleware or custom error page in
// this app, an unguarded throw anywhere in a handler (a transient D1/KV
// error, a missing binding) serves Astro/Cloudflare's HTML error page
// instead — which breaks res.json() on the client with a cryptic
// "Unexpected token '<'" instead of the actual error. Wrap every such
// handler in this so a failure always comes back as JSON.
export function withJsonError(handler: APIRoute): APIRoute {
  return async (context) => {
    try {
      return await handler(context);
    } catch (error) {
      console.error(`[api] ${context.request.method} ${context.url.pathname} failed:`, error);
      return Response.json({ success: false, error: 'Something went wrong' }, { status: 500 });
    }
  };
}

export function redirectBack(request: Request, fallback: string, params?: Record<string, string>): Response {
  const requestUrl = new URL(request.url);
  const candidate = new URL(request.headers.get('referer') || fallback, requestUrl.origin);
  const destination = candidate.origin === requestUrl.origin ? candidate : new URL(fallback, requestUrl.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => destination.searchParams.set(key, value));
  }
  return Response.redirect(destination, 303);
}
