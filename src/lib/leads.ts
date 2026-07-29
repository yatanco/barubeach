export interface LeadData {
  timestamp: string;
  source: 'popup' | 'home_form' | 'daytrip_form' | 'plan' | 'stay' | 'daytrip';
  language: string;
  type: string;
  date?: string;
  checkOut?: string;
  adults: number;
  children?: number;
  transport?: string;
  food?: string;
  occasion?: string;
  whatsapp?: string;
  name?: string;
  email?: string;
  notes?: string;
  estimatedPrice?: string;
  pageUrl: string;
}

export async function captureLead(
  data: Partial<LeadData> & Pick<LeadData, 'source' | 'language' | 'type' | 'adults'>,
): Promise<boolean> {
  const payload: LeadData = {
    timestamp: new Date().toISOString(),
    pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    ...data,
  };

  try {
    const response = await fetch('/api/capture-lead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      keepalive: true,
    });
    if (!response.ok) return false;
    const result = await response.json() as { success?: boolean };
    return result.success === true;
  } catch {
    return false;
  }
}
