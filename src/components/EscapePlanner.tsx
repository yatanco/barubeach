import { useRef, useState } from 'react';
import { captureLead } from '../lib/leads';
import { publicAnalyticsContext, trackGA4Event } from '../lib/analytics';
import { trackMetaEvent } from '../lib/metaPixel';
import { waLink } from '../lib/whatsapp';

interface Props {
  lang?: 'en' | 'es';
}

type Flow = 'daytrip' | 'stay' | null;
type Transport = 'boat' | 'car_boat' | 'own';
type Food = 'service' | 'lobster' | 'own';

function calcDtPrice(adults: number): number | null {
  return adults >= 1 && adults <= 10 ? (adults + 1) * 100 : null;
}

function calcNights(a: string, b: string): number {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000));
}

function calcStPrice(nights: number, adults: number, tr: Transport, fo: Food): number {
  return (
    nights * 350 +
    (tr === 'boat' ? 500 : tr === 'car_boat' ? 400 : 0) +
    (fo === 'service' ? adults * 50 * nights : fo === 'lobster' ? adults * 80 * nights : 0)
  );
}

function calcStTransportCost(tr: Transport): number {
  return tr === 'boat' ? 500 : tr === 'car_boat' ? 400 : 0;
}

function calcStFoodCost(nights: number, adults: number, fo: Food): number {
  return fo === 'service' ? adults * 50 * nights : fo === 'lobster' ? adults * 80 * nights : 0;
}

function fmtCOP(usd: number): string {
  return '$' + (usd * 4200).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.') + ' COP';
}

function fmtDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function addOneDay(iso: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  d.setDate(d.getDate() + 1);
  return d.toISOString().split('T')[0];
}

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function buildDtWA(date: string, adults: number, children: number, price: number | null): string {
  let msg = `Hola Casa Gaviota! 👋\n\nQuiero verificar disponibilidad para un pasadía.\nFecha: ${fmtDate(date)}\nAdultos: ${adults}`;
  if (children > 0) msg += `\nNiños: ${children}`;
  if (price !== null) msg += `\nPrecio estimado: $${price} USD`;
  else msg += `\nGrupo grande — solicito cotización personalizada`;
  msg += `\n\nMi nombre: (completar)`;
  return waLink(msg);
}

function buildStWA(checkin: string, checkout: string, nights: number, adults: number, children: number, tr: Transport, fo: Food, price: number): string {
  const trLabel = tr === 'boat' ? 'Lancha privada' : tr === 'car_boat' ? 'Carro + lancha' : 'Transporte propio';
  const foLabel = fo === 'service' ? 'Servicio de comidas' : fo === 'lobster' ? 'Paquete langosta' : 'Traen su propia comida';
  let msg = `Hola Casa Gaviota! 👋\n\nQuiero verificar disponibilidad para una estadía.\nCheck-in: ${fmtDate(checkin)}\nCheck-out: ${fmtDate(checkout)}\nNoches: ${nights}\nAdultos: ${adults}`;
  if (children > 0) msg += `\nNiños: ${children}`;
  msg += `\nTransporte: ${trLabel}\nAlimentación: ${foLabel}\nPrecio estimado: ~$${price} USD\n\nMi nombre: (completar)`;
  return waLink(msg);
}

// ── Translations ───────────────────────────────────────────────────────────────

const T = {
  en: {
    chooseSub: 'Choose your experience',
    dtTitle: 'Day Trip',
    dtDesc: 'Arrive morning, leave by 3 PM',
    stTitle: 'Overnight Stay',
    stDesc: 'Sleep to the sound of the waves',
    dtHeadings: ['When are you coming?', 'Your group', 'Your estimate'],
    stHeadings: ['When are you visiting?', 'Your group', 'Add-ons', 'Your estimate'],
    date: 'Date',
    checkin: 'Check-in',
    checkout: 'Check-out',
    adults: 'Adults',
    children: 'Children (under 12)',
    transport: 'Transport',
    food: 'Food',
    trOpts: [
      { value: 'boat' as Transport, label: '🚤 Private boat', price: '$500' },
      { value: 'car_boat' as Transport, label: '🚗 Car + boat', price: '$400' },
      { value: 'own' as Transport, label: '🏎️ Own transport', price: 'Free' },
    ],
    foOpts: [
      { value: 'service' as Food, label: '🍽️ Full meal service', price: '$50/person/night' },
      { value: 'lobster' as Food, label: '🦞 Lobster package', price: '$80/person/night' },
      { value: 'own' as Food, label: '🧺 Bring your own', price: 'Free' },
    ],
    nights: (n: number) => `${n} night${n !== 1 ? 's' : ''}`,
    houseRow: (n: number) => `House × ${n} night${n !== 1 ? 's' : ''}`,
    trRow: 'Transport',
    foRow: 'Food',
    totalRow: 'Total estimate',
    approx: '~',
    waBtn: '💬 Check Availability on WhatsApp',
    largeMsg: 'For groups over 10, we build a custom quote.',
    largeWA: '💬 Request a Custom Quote',
    toggleCOP: 'See in Colombian pesos (COP)',
    toggleUSD: 'See in USD',
    emailH: 'Want a copy? Leave your email and we\'ll follow up',
    nameLabel: 'Your name',
    emailLabel: 'Your email',
    emailBtn: 'Send Estimate',
    emailOk: '✓ Got it — we\'ll be in touch soon.',
    back: '← Back',
    next: 'Continue →',
    stepOf: (s: number, t: number) => `Step ${s} of ${t}`,
    errDate: 'Please select a date.',
    errCheckin: 'Please select a check-in date.',
    errCheckout: 'Please select a check-out date.',
    errNights: 'Check-out must be after check-in.',
  },
  es: {
    chooseSub: 'Elige tu experiencia',
    dtTitle: 'Pasadía',
    dtDesc: 'Llegás en la mañana, salís a las 3 PM',
    stTitle: 'Estadía',
    stDesc: 'Dormís al son de las olas',
    dtHeadings: ['¿Cuándo vas a venir?', 'Tu grupo', 'Tu estimado'],
    stHeadings: ['¿Cuándo vas a visitar?', 'Tu grupo', 'Extras', 'Tu estimado'],
    date: 'Fecha',
    checkin: 'Check-in',
    checkout: 'Check-out',
    adults: 'Adultos',
    children: 'Niños (menores de 12)',
    transport: 'Transporte',
    food: 'Alimentación',
    trOpts: [
      { value: 'boat' as Transport, label: '🚤 Lancha privada', price: '$500' },
      { value: 'car_boat' as Transport, label: '🚗 Carro + lancha', price: '$400' },
      { value: 'own' as Transport, label: '🏎️ Transporte propio', price: 'Gratis' },
    ],
    foOpts: [
      { value: 'service' as Food, label: '🍽️ Servicio de comidas', price: '$50/persona/noche' },
      { value: 'lobster' as Food, label: '🦞 Paquete langosta', price: '$80/persona/noche' },
      { value: 'own' as Food, label: '🧺 Traen su comida', price: 'Gratis' },
    ],
    nights: (n: number) => `${n} noche${n !== 1 ? 's' : ''}`,
    houseRow: (n: number) => `Casa × ${n} noche${n !== 1 ? 's' : ''}`,
    trRow: 'Transporte',
    foRow: 'Alimentación',
    totalRow: 'Total estimado',
    approx: '~',
    waBtn: '💬 Verificar Disponibilidad por WhatsApp',
    largeMsg: 'Para grupos de más de 10, preparamos una cotización personalizada.',
    largeWA: '💬 Solicitar Cotización Personalizada',
    toggleCOP: 'Ver en pesos colombianos (COP)',
    toggleUSD: 'Ver en dólares (USD)',
    emailH: '¿Querés una copia? Dejá tu email y te contactamos',
    nameLabel: 'Tu nombre',
    emailLabel: 'Tu email',
    emailBtn: 'Enviar Estimado',
    emailOk: '✓ Listo — te contactaremos pronto.',
    back: '← Volver',
    next: 'Continuar →',
    stepOf: (s: number, t: number) => `Paso ${s} de ${t}`,
    errDate: 'Por favor seleccioná una fecha.',
    errCheckin: 'Por favor seleccioná la fecha de check-in.',
    errCheckout: 'Por favor seleccioná la fecha de check-out.',
    errNights: 'El check-out debe ser después del check-in.',
  },
};

// ── Sub-components ─────────────────────────────────────────────────────────────

function CounterRow({ label, value, min, max, onChange }: {
  label: string; value: number; min: number; max: number; onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-sand/60 last:border-0">
      <span className="text-ink/70 text-sm font-medium">{label}</span>
      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          className="w-8 h-8 rounded-full border border-sand text-brown font-semibold text-lg flex items-center justify-center hover:bg-sand/30 disabled:opacity-30 transition-colors"
        >
          −
        </button>
        <span className="w-5 text-center font-semibold text-brown tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          className="w-8 h-8 rounded-full border border-sand text-brown font-semibold text-lg flex items-center justify-center hover:bg-sand/30 disabled:opacity-30 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}

function DateField({ label, value, onChange, min }: {
  label: string; value: string; onChange: (v: string) => void; min?: string;
}) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-ink/60 mb-1.5">{label}</label>
      <input
        type="date"
        value={value}
        min={min ?? todayISO()}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-sand rounded-xl px-4 py-3 text-brown font-medium focus:outline-none focus:ring-2 focus:ring-ocean/40 focus:border-ocean transition-colors"
      />
    </div>
  );
}

function RadioGroup({ label, options, value, onChange }: {
  label: string;
  options: Array<{ value: string; label: string; price: string }>;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="mb-5">
      <p className="text-sm font-medium text-ink/60 mb-2">{label}</p>
      <div className="flex flex-col gap-2">
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className={`flex items-center justify-between px-4 py-3 rounded-xl border text-left transition-all ${
              value === opt.value
                ? 'border-brown bg-brown/5 text-brown'
                : 'border-sand text-ink/70 hover:border-brown/40'
            }`}
          >
            <span className="text-sm font-medium">{opt.label}</span>
            <span className={`text-xs font-semibold ${value === opt.value ? 'text-brown' : 'text-ink/40'}`}>
              {opt.price}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PriceRow({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between items-center py-2 ${bold ? 'border-t border-[#C4A07A] mt-1 pt-3' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-[#57392E]' : 'text-[#57392E]/70'}`}>{label}</span>
      <span className={`text-sm ${bold ? 'font-bold text-[#57392E] text-base' : 'text-[#57392E]/80'}`}>{value}</span>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function EscapePlanner({ lang = 'en' }: Props) {
  const t = T[lang];
  const today = todayISO();

  const [flow, setFlow] = useState<Flow>(null);
  const [step, setStep] = useState(1);

  // Day trip state
  const [dtDate, setDtDate] = useState('');
  const [dtAdults, setDtAdults] = useState(2);
  const [dtChildren, setDtChildren] = useState(0);

  // Stay state
  const [stCheckin, setStCheckin] = useState('');
  const [stCheckout, setStCheckout] = useState('');
  const [stAdults, setStAdults] = useState(2);
  const [stChildren, setStChildren] = useState(0);
  const [stTransport, setStTransport] = useState<Transport>('boat');
  const [stFood, setStFood] = useState<Food>('service');

  // UI state
  const [showCOP, setShowCOP] = useState(false);
  const [error, setError] = useState('');
  const [emailName, setEmailName] = useState('');
  const [emailAddr, setEmailAddr] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const trackedSubmissions = useRef(new Set<string>());

  const totalSteps = flow === 'daytrip' ? 3 : 4;
  const nights = calcNights(stCheckin, stCheckout);
  const dtPrice = flow === 'daytrip' ? calcDtPrice(dtAdults) : null;
  const stPrice = flow === 'stay' && nights > 0 ? calcStPrice(nights, stAdults, stTransport, stFood) : 0;

  function selectFlow(f: Flow) {
    trackGA4Event('lead_form_open', {
      form_name: 'availability_enquiry',
      language: lang,
      page_path: window.location.pathname,
    });
    setFlow(f);
    setStep(1);
    setError('');
  }

  function validate(): boolean {
    if (flow === 'daytrip' && step === 1 && !dtDate) {
      setError(t.errDate); return false;
    }
    if (flow === 'stay' && step === 1) {
      if (!stCheckin) { setError(t.errCheckin); return false; }
      if (!stCheckout) { setError(t.errCheckout); return false; }
      if (nights < 1) { setError(t.errNights); return false; }
    }
    setError('');
    return true;
  }

  function goNext() {
    if (!validate()) return;
    setStep(s => s + 1);
  }

  function goBack() {
    if (step === 1) { setFlow(null); return; }
    setStep(s => s - 1);
    setError('');
  }

  function trackConfirmedLead(type: 'daytrip' | 'stay', key: string): boolean {
    if (trackedSubmissions.current.has(key)) return false;
    trackedSubmissions.current.add(key);
    const analyticsContext = publicAnalyticsContext(lang, type);
    trackGA4Event('generate_lead', {
      currency: 'COP',
      form_name: 'availability_enquiry',
      ...analyticsContext,
    });
    trackMetaEvent('Lead');
    return true;
  }

  async function handleDtWA() {
    if (trackedSubmissions.current.has('daytrip-whatsapp')) return;
    const whatsappWindow = window.open('', '_blank');
    const captured = await captureLead({
      source: 'plan', language: lang, type: 'daytrip',
      adults: dtAdults, children: dtChildren, date: dtDate,
      estimatedPrice: dtPrice !== null ? `$${dtPrice} USD` : 'large group',
      pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    });
    if (!captured) {
      whatsappWindow?.close();
      setError(lang === 'es' ? 'No pudimos guardar tu solicitud. Intenta de nuevo.' : 'We could not save your enquiry. Please try again.');
      return;
    }
    if (!trackConfirmedLead('daytrip', 'daytrip-whatsapp')) return;
    trackGA4Event('whatsapp_click', {
      link_type: 'whatsapp',
      ...publicAnalyticsContext(lang, 'daytrip'),
    });
    const whatsappUrl = buildDtWA(dtDate, dtAdults, dtChildren, dtPrice);
    if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
    else window.location.href = whatsappUrl;
  }

  async function handleStWA() {
    if (trackedSubmissions.current.has('stay-whatsapp')) return;
    const whatsappWindow = window.open('', '_blank');
    const captured = await captureLead({
      source: 'plan', language: lang, type: 'stay',
      adults: stAdults, children: stChildren, date: stCheckin, checkOut: stCheckout,
      transport: stTransport, food: stFood, estimatedPrice: `~$${stPrice} USD`,
      pageUrl: typeof window !== 'undefined' ? window.location.href : '',
    });
    if (!captured) {
      whatsappWindow?.close();
      setError(lang === 'es' ? 'No pudimos guardar tu solicitud. Intenta de nuevo.' : 'We could not save your enquiry. Please try again.');
      return;
    }
    if (!trackConfirmedLead('stay', 'stay-whatsapp')) return;
    trackGA4Event('whatsapp_click', {
      link_type: 'whatsapp',
      ...publicAnalyticsContext(lang, 'stay'),
    });
    const whatsappUrl = buildStWA(stCheckin, stCheckout, nights, stAdults, stChildren, stTransport, stFood, stPrice);
    if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
    else window.location.href = whatsappUrl;
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    const submissionKey = `${flow}-email`;
    if (trackedSubmissions.current.has(submissionKey)) return;
    const payload = flow === 'daytrip'
      ? { source: 'plan', language: lang, type: 'daytrip', adults: dtAdults, children: dtChildren, date: dtDate, estimatedPrice: dtPrice !== null ? `$${dtPrice} USD` : 'large group', name: emailName, email: emailAddr, pageUrl: typeof window !== 'undefined' ? window.location.href : '' }
      : { source: 'plan', language: lang, type: 'stay', adults: stAdults, children: stChildren, date: stCheckin, checkOut: stCheckout, transport: stTransport, food: stFood, estimatedPrice: `~$${stPrice} USD`, name: emailName, email: emailAddr, pageUrl: typeof window !== 'undefined' ? window.location.href : '' };
    const captured = await captureLead(payload);
    if (!captured) {
      setError(lang === 'es' ? 'No pudimos guardar tu solicitud. Intenta de nuevo.' : 'We could not save your enquiry. Please try again.');
      return;
    }
    if (!trackConfirmedLead(flow === 'daytrip' ? 'daytrip' : 'stay', submissionKey)) return;
    setEmailSent(true);
  }

  // ── Type selection screen ──────────────────────────────────────────────────

  if (flow === null) {
    return (
      <div className="ep-fade">
        <style>{`@keyframes ep-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.ep-fade{animation:ep-fade .3s ease}`}</style>
        <p className="text-center text-ink/40 text-sm mb-6">{t.chooseSub}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { flow: 'daytrip' as Flow, emoji: '☀️', title: t.dtTitle, desc: t.dtDesc },
            { flow: 'stay' as Flow, emoji: '🌙', title: t.stTitle, desc: t.stDesc },
          ].map(opt => (
            <button
              key={opt.flow as string}
              onClick={() => selectFlow(opt.flow)}
              className="border-2 border-sand rounded-2xl p-6 text-left hover:border-brown hover:shadow-md transition-all group"
            >
              <div className="text-4xl mb-3">{opt.emoji}</div>
              <div className="font-serif text-xl font-semibold text-brown mb-1 group-hover:text-brown">{opt.title}</div>
              <div className="text-ink/55 text-sm leading-snug">{opt.desc}</div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step headings ──────────────────────────────────────────────────────────

  const heading = flow === 'daytrip'
    ? t.dtHeadings[step - 1]
    : t.stHeadings[step - 1];

  const progressPct = (step / totalSteps) * 100;

  // ── Render step content ────────────────────────────────────────────────────

  const isFinalStep = step === totalSteps;
  const trCost = calcStTransportCost(stTransport);
  const foCost = calcStFoodCost(nights, stAdults, stFood);

  return (
    <div>
      <style>{`@keyframes ep-fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}.ep-fade{animation:ep-fade .3s ease}`}</style>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-ink/40">{t.stepOf(step, totalSteps)}</span>
        </div>
        <div className="h-0.5 bg-sand/40 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progressPct}%`, backgroundColor: '#B28471' }}
          />
        </div>
      </div>

      {/* Step heading + content */}
      <div key={`${flow}-${step}`} className="ep-fade">
        <h2 className="font-serif text-2xl font-semibold text-brown mb-6">{heading}</h2>

        {/* Day trip — Step 1: Date */}
        {flow === 'daytrip' && step === 1 && (
          <DateField label={t.date} value={dtDate} onChange={setDtDate} min={today} />
        )}

        {/* Day trip — Step 2: Group */}
        {flow === 'daytrip' && step === 2 && (
          <div className="border border-sand/60 rounded-2xl px-5 py-2">
            <CounterRow label={t.adults} value={dtAdults} min={1} max={30} onChange={setDtAdults} />
            <CounterRow label={t.children} value={dtChildren} min={0} max={20} onChange={setDtChildren} />
          </div>
        )}

        {/* Day trip — Step 3: Price */}
        {flow === 'daytrip' && step === 3 && (
          <DtPriceStep
            t={t} dtAdults={dtAdults} dtChildren={dtChildren} dtDate={dtDate}
            dtPrice={dtPrice} showCOP={showCOP} setShowCOP={setShowCOP}
            emailName={emailName} setEmailName={setEmailName}
            emailAddr={emailAddr} setEmailAddr={setEmailAddr}
            emailSent={emailSent}
            onWA={handleDtWA} onEmail={handleEmailSubmit}
          />
        )}

        {/* Stay — Step 1: Dates */}
        {flow === 'stay' && step === 1 && (
          <div>
            <DateField label={t.checkin} value={stCheckin} onChange={v => { setStCheckin(v); if (stCheckout && v >= stCheckout) setStCheckout(''); }} min={today} />
            <DateField label={t.checkout} value={stCheckout} onChange={setStCheckout} min={addOneDay(stCheckin) || today} />
            {nights > 0 && (
              <p className="text-center text-sm text-ink/50 mt-1">{t.nights(nights)}</p>
            )}
          </div>
        )}

        {/* Stay — Step 2: Group */}
        {flow === 'stay' && step === 2 && (
          <div className="border border-sand/60 rounded-2xl px-5 py-2">
            <CounterRow label={t.adults} value={stAdults} min={1} max={30} onChange={setStAdults} />
            <CounterRow label={t.children} value={stChildren} min={0} max={20} onChange={setStChildren} />
          </div>
        )}

        {/* Stay — Step 3: Add-ons */}
        {flow === 'stay' && step === 3 && (
          <div>
            <RadioGroup label={t.transport} options={t.trOpts} value={stTransport} onChange={v => setStTransport(v as Transport)} />
            <RadioGroup label={t.food} options={t.foOpts} value={stFood} onChange={v => setStFood(v as Food)} />
          </div>
        )}

        {/* Stay — Step 4: Price */}
        {flow === 'stay' && step === 4 && (
          <StPriceStep
            t={t} nights={nights} stAdults={stAdults} stChildren={stChildren}
            stCheckin={stCheckin} stCheckout={stCheckout}
            stTransport={stTransport} stFood={stFood}
            stPrice={stPrice} trCost={trCost} foCost={foCost}
            showCOP={showCOP} setShowCOP={setShowCOP}
            emailName={emailName} setEmailName={setEmailName}
            emailAddr={emailAddr} setEmailAddr={setEmailAddr}
            emailSent={emailSent}
            onWA={handleStWA} onEmail={handleEmailSubmit}
          />
        )}
      </div>

      {/* Error */}
      {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

      {/* Navigation */}
      <div className={`flex ${isFinalStep ? 'justify-center' : 'justify-between'} items-center mt-8`}>
        <button onClick={goBack} className="text-sm text-ink/45 hover:text-ink transition-colors">
          {t.back}
        </button>
        {!isFinalStep && (
          <button
            onClick={goNext}
            className="bg-brown text-white text-sm font-semibold px-7 py-3 rounded-full hover:opacity-90 transition-opacity"
          >
            {t.next}
          </button>
        )}
      </div>
    </div>
  );
}

// ── Price step sub-components ──────────────────────────────────────────────────

type TShape = typeof T['en'];

function EmailForm({ t, emailName, setEmailName, emailAddr, setEmailAddr, emailSent, onEmail }: {
  t: TShape;
  emailName: string; setEmailName: (v: string) => void;
  emailAddr: string; setEmailAddr: (v: string) => void;
  emailSent: boolean;
  onEmail: (e: React.FormEvent) => void;
}) {
  if (emailSent) return <p className="text-center text-sm text-ocean mt-4">{t.emailOk}</p>;
  return (
    <form onSubmit={onEmail} className="mt-5 pt-4 border-t border-sand/50">
      <p className="text-xs text-ink/45 text-center mb-3">{t.emailH}</p>
      <div className="flex flex-col sm:flex-row gap-2">
        <input
          type="text" required value={emailName} onChange={e => setEmailName(e.target.value)}
          placeholder={t.nameLabel}
          className="flex-1 border border-sand rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ocean/30"
        />
        <input
          type="email" required value={emailAddr} onChange={e => setEmailAddr(e.target.value)}
          placeholder={t.emailLabel}
          className="flex-1 border border-sand rounded-xl px-3 py-2.5 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-ocean/30"
        />
      </div>
      <button
        type="submit"
        className="w-full mt-2 border border-sand/80 text-brown text-sm font-medium py-2.5 rounded-xl hover:bg-sand/20 transition-colors"
      >
        {t.emailBtn}
      </button>
    </form>
  );
}

function DtPriceStep({ t, dtAdults, dtChildren, dtDate, dtPrice, showCOP, setShowCOP, emailName, setEmailName, emailAddr, setEmailAddr, emailSent, onWA, onEmail }: {
  t: TShape; dtAdults: number; dtChildren: number; dtDate: string;
  dtPrice: number | null; showCOP: boolean; setShowCOP: (v: boolean) => void;
  emailName: string; setEmailName: (v: string) => void;
  emailAddr: string; setEmailAddr: (v: string) => void;
  emailSent: boolean;
  onWA: () => void; onEmail: (e: React.FormEvent) => void;
}) {
  const isLarge = dtPrice === null;
  return (
    <div>
      {isLarge ? (
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: '#E6C497' }}>
          <p className="text-sm leading-relaxed" style={{ color: '#B28471' }}>{t.largeMsg}</p>
        </div>
      ) : (
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#E6C497' }}>
          <PriceRow label={t.totalRow} value={showCOP ? fmtCOP(dtPrice) : `$${dtPrice} USD`} bold />
        </div>
      )}

      <div className="mt-2 text-center">
        <button
          onClick={() => setShowCOP(!showCOP)}
          className="text-xs text-ink/40 hover:text-ink/70 transition-colors underline underline-offset-2"
        >
          {showCOP ? t.toggleUSD : t.toggleCOP}
        </button>
      </div>

      <button
        onClick={onWA}
        className="w-full mt-5 text-white font-semibold py-4 rounded-2xl text-sm hover:opacity-90 transition-opacity"
        style={{ backgroundColor: '#25D366' }}
      >
        {isLarge ? t.largeWA : t.waBtn}
      </button>

      <EmailForm t={t} emailName={emailName} setEmailName={setEmailName} emailAddr={emailAddr} setEmailAddr={setEmailAddr} emailSent={emailSent} onEmail={onEmail} />
    </div>
  );
}

function StPriceStep({ t, nights, stAdults, stChildren, stCheckin, stCheckout, stTransport, stFood, stPrice, trCost, foCost, showCOP, setShowCOP, emailName, setEmailName, emailAddr, setEmailAddr, emailSent, onWA, onEmail }: {
  t: TShape; nights: number; stAdults: number; stChildren: number;
  stCheckin: string; stCheckout: string;
  stTransport: Transport; stFood: Food;
  stPrice: number; trCost: number; foCost: number;
  showCOP: boolean; setShowCOP: (v: boolean) => void;
  emailName: string; setEmailName: (v: string) => void;
  emailAddr: string; setEmailAddr: (v: string) => void;
  emailSent: boolean;
  onWA: () => void; onEmail: (e: React.FormEvent) => void;
}) {
  const fmt = (usd: number) => showCOP ? fmtCOP(usd) : `$${usd} USD`;
  return (
    <div>
      <div className="rounded-2xl p-6" style={{ backgroundColor: '#E6C497' }}>
        <PriceRow label={t.houseRow(nights)} value={fmt(nights * 350)} />
        {trCost > 0 && <PriceRow label={t.trRow} value={fmt(trCost)} />}
        {foCost > 0 && <PriceRow label={t.foRow} value={fmt(foCost)} />}
        <PriceRow label={t.totalRow} value={`${t.approx}${fmt(stPrice)}`} bold />
      </div>

      <div className="mt-2 text-center">
        <button
          onClick={() => setShowCOP(!showCOP)}
          className="text-xs text-ink/40 hover:text-ink/70 transition-colors underline underline-offset-2"
        >
          {showCOP ? t.toggleUSD : t.toggleCOP}
        </button>
      </div>

      <button
        onClick={onWA}
        className="w-full mt-5 text-white font-semibold py-4 rounded-2xl text-sm hover:opacity-90 transition-opacity"
        style={{ backgroundColor: '#25D366' }}
      >
        {t.waBtn}
      </button>

      <EmailForm t={t} emailName={emailName} setEmailName={setEmailName} emailAddr={emailAddr} setEmailAddr={setEmailAddr} emailSent={emailSent} onEmail={onEmail} />
    </div>
  );
}
