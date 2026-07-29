export type AnalyticsParameters = Record<string, string | number | boolean>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (
      command: 'js' | 'config' | 'event',
      eventNameOrDate: string | Date,
      parameters?: AnalyticsParameters,
    ) => void;
  }
}

export function trackGA4Event(
  eventName: string,
  parameters: AnalyticsParameters = {},
): void {
  if (typeof window === 'undefined') return;

  if (typeof window.gtag !== 'function') {
    if (import.meta.env.DEV) {
      console.warn(`[GA4] gtag unavailable for event: ${eventName}`);
    }
    return;
  }

  window.gtag('event', eventName, parameters);
}

export function leadTypeForAnalytics(type?: string | null): 'overnight' | 'day_trip' | 'general' {
  if (type === 'stay' || type === 'overnight') return 'overnight';
  if (type === 'daytrip' || type === 'day_trip') return 'day_trip';
  return 'general';
}

export function publicAnalyticsContext(language: string, type?: string | null) {
  return {
    language,
    page_path: typeof window !== 'undefined' ? window.location.pathname : '',
    lead_type: leadTypeForAnalytics(type),
  };
}
