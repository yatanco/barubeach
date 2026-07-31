import type { APIContext } from 'astro';

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

interface RuntimeEnv {
  DB?: D1Database;
  LEADS_WEBHOOK_URL?: string;
  HOSTHUB_API_KEY?: string;
  HOSTHUB_RENTAL_ID?: string;
  HOSTHUB_BASE_URL?: string;
  HOSTHUB_ICAL_URL?: string;
  BOLD_API_KEY?: string;
  WOMPI_PUBLIC_KEY?: string;
  WOMPI_PRIVATE_KEY?: string;
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

export function redirectBack(request: Request, fallback: string, params?: Record<string, string>): Response {
  const requestUrl = new URL(request.url);
  const candidate = new URL(request.headers.get('referer') || fallback, requestUrl.origin);
  const destination = candidate.origin === requestUrl.origin ? candidate : new URL(fallback, requestUrl.origin);
  if (params) {
    Object.entries(params).forEach(([key, value]) => destination.searchParams.set(key, value));
  }
  return Response.redirect(destination, 303);
}
