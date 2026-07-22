type MetaPixelParameters = Record<string, string | number | boolean>;

declare global {
  interface Window {
    fbq?: (
      action: 'track' | 'trackCustom',
      eventName: string,
      parameters?: MetaPixelParameters,
    ) => void;
  }
}

export function trackMetaEvent(
  eventName: string,
  parameters: MetaPixelParameters = {},
  custom = false,
): void {
  if (typeof window === 'undefined' || typeof window.fbq !== 'function') return;

  window.fbq(custom ? 'trackCustom' : 'track', eventName, parameters);
}

