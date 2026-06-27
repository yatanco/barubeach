import { useState, useEffect } from 'react';
import { captureLead } from '../lib/leads';

interface Props {
  accessKey: string;
  lang?: 'en' | 'es';
}

type ExperienceType = 'daytrip' | 'stay';
type Transport = 'boat' | 'car_boat' | 'own';
type Food = 'service' | 'own';

interface State {
  type: ExperienceType;
  adults: number;
  children: number;
  occasion: string | null;
  date: string;
  checkin: string;
  checkout: string;
  transport: Transport;
  food: Food;
}

// ── Translations ──────────────────────────────────────────────────────────────

const T = {
  en: {
    stepLabels: ['Type', 'Group', 'When', 'Transport', 'Food', 'Summary'],
    stepOf: (n: number) => `Step ${n} of 6`,
    back: '← Back',
    next: 'Continue →',

    s1h: 'What are you planning?',
    s1sub: 'Choose the experience that fits your group.',
    dayTitle: 'Pasadía Privado',
    dayDesc: 'Day Trip — arrive in the morning, leave by sunset',
    stayTitle: 'Estadía',
    stayDesc: 'Overnight Stay — sleep to the sound of waves',

    s2h: 'Your group',
    s2sub: 'Who is coming?',
    adults: 'Adults',
    children: 'Children',
    occasion: 'Occasion',
    optional: 'optional',
    occasions: [
      '🎂 Birthday', '👨‍👩‍👧 Family', '❤️ Couple',
      '🍹 Friends', '🏢 Team day', '😌 Just relaxing',
    ],

    s3h: 'When?',
    s3subDay: 'Pick the date for your day trip.',
    s3subStay: 'Choose your check-in and check-out dates.',
    dateLabel: 'Date',
    checkin: 'Check-in',
    checkout: 'Check-out',

    s4h: 'How will you arrive?',
    s4sub: 'We can help coordinate transport from Cartagena.',
    boatTitle: 'Private boat from Cartagena',
    boatDesc: '~$600.000 COP one way · up to 10 people · fastest option',
    carTitle: 'Car + boat',
    carDesc: '~$200.000 COP/person one way · min $800.000 COP · most popular',
    ownTitle: 'Own transport',
    ownDesc: "You'll arrange your own way to Barú",

    s5h: 'How about food?',
    s5sub: 'Fresh Caribbean meals prepared on-site, or bring your own provisions.',
    svcTitle: 'Casa Gaviota food service',
    svcDayDesc: '$150.000 COP/person — fresh Caribbean lunch and snacks',
    svcStayDesc: '$150.000 COP/person/night — breakfast, lunch, and dinner',
    ownFoodTitle: 'Bring your own provisions',
    ownFoodDesc: 'Buy groceries in Cartagena and bring them along',

    s6h: 'Your Private Escape',
    s6sub: "Here's your estimate. Pricing is confirmed when we chat.",
    rowExp: 'Experience',
    rowDate: 'Date',
    rowDates: 'Dates',
    rowGroup: 'Group',
    rowTransport: 'Transport',
    rowFood: 'Food',
    priceLabel: 'Estimated price',
    priceNote: 'Final pricing confirmed via WhatsApp · This is an estimate',
    waBtn: 'Book via WhatsApp →',
    emailBtn: 'Send inquiry by email',
    emailHeading: 'Send your inquiry by email',
    namePh: 'Full name',
    emailPh: 'Email address',
    phonePh: 'Phone / WhatsApp',
    emailError: 'Something went wrong. Please try WhatsApp instead.',
    emailSend: 'Send inquiry →',
    emailSending: 'Sending…',
    nightsLabel: (n: number) => `${n} night${n !== 1 ? 's' : ''}`,

    transport: { boat: 'Private boat from Cartagena', car_boat: 'Car + boat', own: 'Own transport' } as Record<Transport, string>,
    food: { service: 'Casa Gaviota food service', own: 'Own provisions' } as Record<Food, string>,

    waGreeting: 'Hello Casa Gaviota! 👋',
    waIntro: 'I want to book:',
    waType: { daytrip: 'Day Trip (Pasadía)', stay: 'Overnight Stay (Estadía)' } as Record<ExperienceType, string>,
    waDate: 'Date',
    waCheckin: 'Check-in',
    waCheckout: 'Check-out',
    waAdults: 'Adults',
    waChildren: 'Children',
    waTransport: 'Transport',
    waFood: 'Food',
    waOccasion: 'Occasion',
    waEstimate: 'Estimated',
    waNamePrompt: 'My name is: (fill in)',
    waFooter: 'Sent from casagaviota.com',
    waTbd: 'TBD',

    emailSubject: 'Casa Gaviota — Inquiry via EscapePlanner',
    emailIntro: "Hi, I'm interested in booking Casa Gaviota.",
    emailType: 'Type',
    emailDate: 'Date',
    emailCheckin: 'Check-in',
    emailCheckout: 'Check-out',
    emailAdults: 'Adults',
    emailChildren: 'Children',
    emailTransport: 'Transport',
    emailFood: 'Food',
    emailOccasion: 'Occasion',
    emailEstimate: 'Estimated',
    emailTbd: 'TBD',
    emailClose: 'Please confirm availability and next steps.',

    validationDates: 'Please select both check-in and check-out dates.',
    validationCheckout: 'Check-out must be at least one day after check-in.',

    footerNote: 'Prices are estimates only. Final pricing confirmed via WhatsApp.',
  },

  es: {
    stepLabels: ['Tipo', 'Grupo', 'Cuándo', 'Transporte', 'Comida', 'Resumen'],
    stepOf: (n: number) => `Paso ${n} de 6`,
    back: '← Atrás',
    next: 'Continuar →',

    s1h: '¿Qué estás planeando?',
    s1sub: 'Elige la experiencia que se adapta a tu grupo.',
    dayTitle: 'Pasadía Privado',
    dayDesc: 'Llegás en la mañana, regresás al atardecer.',
    stayTitle: 'Estadía',
    stayDesc: 'Estadía nocturna — dormí al son de las olas.',

    s2h: 'Tu grupo',
    s2sub: '¿Quiénes vienen?',
    adults: 'Adultos',
    children: 'Niños',
    occasion: 'Ocasión',
    optional: 'opcional',
    occasions: [
      '🎂 Cumpleaños', '👨‍👩‍👧 Familia', '❤️ Pareja',
      '🍹 Amigos', '🏢 Team day', '😌 Solo relajar',
    ],

    s3h: '¿Cuándo?',
    s3subDay: 'Elige la fecha para tu pasadía.',
    s3subStay: 'Elige tus fechas de llegada y salida.',
    dateLabel: 'Fecha',
    checkin: 'Check-in',
    checkout: 'Check-out',

    s4h: '¿Cómo llegarán?',
    s4sub: 'Podemos ayudar a coordinar el transporte desde Cartagena.',
    boatTitle: 'Lancha privada desde Cartagena',
    boatDesc: '~$600.000 COP por trayecto · hasta 10 personas · más rápido',
    carTitle: 'Carro + lancha',
    carDesc: '~$200.000 COP/persona por trayecto · mín $800.000 COP · más popular',
    ownTitle: 'Transporte propio',
    ownDesc: 'Organizás tu propio camino hasta Barú',

    s5h: '¿Y la comida?',
    s5sub: 'Comida caribeña fresca preparada en la casa, o traé tus propios víveres.',
    svcTitle: 'Servicio de comida (Casa Gaviota)',
    svcDayDesc: '$150.000 COP/persona — almuerzo caribeño fresco y snacks',
    svcStayDesc: '$150.000 COP/persona/noche — desayuno, almuerzo y cena',
    ownFoodTitle: 'Víveres propios',
    ownFoodDesc: 'Comprás en Cartagena y lo traés',

    s6h: 'Tu Escape Privado',
    s6sub: 'Aquí está tu estimado. El precio final se confirma cuando hablamos.',
    rowExp: 'Experiencia',
    rowDate: 'Fecha',
    rowDates: 'Fechas',
    rowGroup: 'Grupo',
    rowTransport: 'Transporte',
    rowFood: 'Comida',
    priceLabel: 'Precio estimado',
    priceNote: 'Precio final confirmado por WhatsApp · Este es un estimado',
    waBtn: 'Reservar por WhatsApp →',
    emailBtn: 'Enviar consulta por email',
    emailHeading: 'Enviar consulta por email',
    namePh: 'Nombre completo',
    emailPh: 'Correo electrónico',
    phonePh: 'Teléfono / WhatsApp',
    emailError: 'Algo salió mal. Intenta por WhatsApp.',
    emailSend: 'Enviar consulta →',
    emailSending: 'Enviando…',
    nightsLabel: (n: number) => `${n} noche${n !== 1 ? 's' : ''}`,

    transport: { boat: 'Lancha privada desde Cartagena', car_boat: 'Carro + lancha', own: 'Transporte propio' } as Record<Transport, string>,
    food: { service: 'Servicio de comida (Casa Gaviota)', own: 'Víveres propios' } as Record<Food, string>,

    waGreeting: 'Hola Casa Gaviota! 👋',
    waIntro: 'Quiero reservar:',
    waType: { daytrip: 'Pasadía Privado', stay: 'Estadía Nocturna' } as Record<ExperienceType, string>,
    waDate: 'Fecha',
    waCheckin: 'Check-in',
    waCheckout: 'Check-out',
    waAdults: 'Adultos',
    waChildren: 'Niños',
    waTransport: 'Transporte',
    waFood: 'Comida',
    waOccasion: 'Ocasión',
    waEstimate: 'Precio estimado',
    waNamePrompt: 'Mi nombre es: (completar)',
    waFooter: 'Enviado desde casagaviota.com',
    waTbd: 'Por confirmar',

    emailSubject: 'Casa Gaviota — Consulta vía EscapePlanner',
    emailIntro: 'Hola, me interesa reservar Casa Gaviota.',
    emailType: 'Tipo',
    emailDate: 'Fecha',
    emailCheckin: 'Check-in',
    emailCheckout: 'Check-out',
    emailAdults: 'Adultos',
    emailChildren: 'Niños',
    emailTransport: 'Transporte',
    emailFood: 'Comida',
    emailOccasion: 'Ocasión',
    emailEstimate: 'Estimado',
    emailTbd: 'Por confirmar',
    emailClose: 'Por favor confirma disponibilidad y próximos pasos.',

    validationDates: 'Por favor seleccioná las fechas de llegada y salida.',
    validationCheckout: 'El check-out debe ser al menos un día después del check-in.',

    footerNote: 'Precios son estimados. El precio final se confirma por WhatsApp.',
  },
};

// ── Pricing helpers ───────────────────────────────────────────────────────────

function calcNights(a: string, b: string): number {
  if (!a || !b) return 0;
  return Math.max(0, Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000));
}

function calcDayTrip(adults: number, transport: Transport, food: Food): number {
  let total = 1_200_000;
  if (transport === 'boat') total += 600_000 * 2;
  else if (transport === 'car_boat') total += Math.max(800_000, adults * 200_000) * 2;
  if (food === 'service') total += 150_000 * adults;
  return total;
}

function calcStay(nights: number, adults: number, transport: Transport, food: Food): number {
  const n = Math.max(1, nights);
  let total = n * 350 * 4_000 + 320_000;
  if (transport === 'boat') total += 600_000 * 2;
  else if (transport === 'car_boat') total += Math.max(800_000, adults * 200_000) * 2;
  if (food === 'service') total += 150_000 * adults * n;
  return total;
}

function formatCOP(n: number): string {
  return '$' + n.toLocaleString('es-CO') + ' COP';
}

function formatUSD(cop: number): string {
  return '≈ $' + Math.round(cop / 4_000).toLocaleString('en-US') + ' USD';
}

// ── Message builders ──────────────────────────────────────────────────────────

function buildWAMessage(s: State, t: typeof T['en']): string {
  const nights = calcNights(s.checkin, s.checkout);
  const price = s.type === 'daytrip'
    ? calcDayTrip(s.adults, s.transport, s.food)
    : calcStay(nights, s.adults, s.transport, s.food);

  let msg = `${t.waGreeting}\n\n${t.waIntro}\n`;
  msg += `Tipo: ${t.waType[s.type]}\n`;
  if (s.type === 'daytrip') {
    msg += `${t.waDate}: ${s.date || t.waTbd}`;
  } else {
    msg += `${t.waCheckin}: ${s.checkin || t.waTbd}\n${t.waCheckout}: ${s.checkout || t.waTbd}`;
    if (nights > 0) msg += ` (${t.nightsLabel(nights)})`;
  }
  msg += `\n${t.waAdults}: ${s.adults}`;
  if (s.children > 0) msg += `\n${t.waChildren}: ${s.children}`;
  msg += `\n${t.waTransport}: ${t.transport[s.transport]}`;
  msg += `\n${t.waFood}: ${t.food[s.food]}`;
  if (s.occasion) msg += `\n${t.waOccasion}: ${s.occasion}`;
  msg += `\n\n${t.waEstimate}: ${formatCOP(price)} (${formatUSD(price)})\n\n${t.waNamePrompt}`;
  return msg;
}

function buildEmailMessage(s: State, t: typeof T['en']): string {
  const nights = calcNights(s.checkin, s.checkout);
  const price = s.type === 'daytrip'
    ? calcDayTrip(s.adults, s.transport, s.food)
    : calcStay(nights, s.adults, s.transport, s.food);

  let msg = `${t.emailIntro}\n\n${t.emailType}: ${t.waType[s.type]}\n`;
  if (s.type === 'daytrip') {
    msg += `${t.emailDate}: ${s.date || t.emailTbd}`;
  } else {
    msg += `${t.emailCheckin}: ${s.checkin || t.emailTbd}\n${t.emailCheckout}: ${s.checkout || t.emailTbd}`;
    if (nights > 0) msg += ` (${t.nightsLabel(nights)})`;
  }
  msg += `\n${t.emailAdults}: ${s.adults}`;
  if (s.children > 0) msg += `\n${t.emailChildren}: ${s.children}`;
  msg += `\n${t.emailTransport}: ${t.transport[s.transport]}`;
  msg += `\n${t.emailFood}: ${t.food[s.food]}`;
  if (s.occasion) msg += `\n${t.emailOccasion}: ${s.occasion}`;
  msg += `\n\n${t.emailEstimate}: ${formatCOP(price)} (${formatUSD(price)})\n\n${t.emailClose}`;
  return msg;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputCls = 'w-full rounded-xl border border-terracotta/30 bg-white px-4 py-3 text-sm text-ink placeholder-ink/40 focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/15 transition';

const toggleBtn = (active: boolean) =>
  `py-3 px-4 rounded-xl border text-sm font-medium transition-all text-left ${
    active ? 'bg-brown text-white border-brown shadow-sm' : 'bg-white text-ink border-terracotta/30 hover:border-brown/40'
  }`;

const counterBtn = 'w-9 h-9 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink transition flex items-center justify-center text-lg leading-none';

// ── Component ─────────────────────────────────────────────────────────────────

interface BlockedRange { start: string; end: string; }

function dateToMs(d: string) { return new Date(d).getTime(); }

function isDateBlocked(date: string, blocked: BlockedRange[]): boolean {
  const t = dateToMs(date);
  return blocked.some(r => t >= dateToMs(r.start) && t <= dateToMs(r.end));
}

function isRangeBlocked(start: string, end: string, blocked: BlockedRange[]): boolean {
  const s = dateToMs(start), e = dateToMs(end);
  return blocked.some(r => s < dateToMs(r.end) && e > dateToMs(r.start));
}

export default function EscapePlanner({ accessKey, lang = 'en' }: Props) {
  const t = T[lang];
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState<BlockedRange[]>([]);
  const [s, setS] = useState<State>({
    type: 'daytrip',
    adults: 2,
    children: 0,
    occasion: null,
    date: '',
    checkin: '',
    checkout: '',
    transport: 'car_boat',
    food: 'service',
  });

  const [showEmailForm, setShowEmailForm] = useState(false);
  const [emailName, setEmailName] = useState('');
  const [emailEmail, setEmailEmail] = useState('');
  const [emailPhone, setEmailPhone] = useState('');
  const [emailMessage, setEmailMessage] = useState('');
  const [emailStatus, setEmailStatus] = useState<'idle' | 'submitting' | 'error'>('idle');

  useEffect(() => {
    fetch('/api/availability')
      .then(r => r.json())
      .then((data: { blocked?: BlockedRange[] }) => { if (data.blocked) setBlocked(data.blocked); })
      .catch(() => {});
  }, []);

  function update<K extends keyof State>(key: K, val: State[K]) {
    setS(prev => ({ ...prev, [key]: val }));
    setError(null);
  }

  const today = new Date().toISOString().split('T')[0];
  const nights = calcNights(s.checkin, s.checkout);
  const price = s.type === 'daytrip'
    ? calcDayTrip(s.adults, s.transport, s.food)
    : calcStay(nights, s.adults, s.transport, s.food);

  function handleNext() {
    setError(null);
    if (step === 3) {
      if (s.type === 'stay') {
        if (!s.checkin || !s.checkout) { setError(t.validationDates); return; }
        if (calcNights(s.checkin, s.checkout) < 1) { setError(t.validationCheckout); return; }
        if (blocked.length > 0 && isRangeBlocked(s.checkin, s.checkout, blocked)) {
          setError(lang === 'es' ? 'Esas fechas no están disponibles. Por favor elige otras.' : 'Those dates are not available. Please choose different dates.');
          return;
        }
      } else if (s.type === 'daytrip' && s.date && blocked.length > 0 && isDateBlocked(s.date, blocked)) {
        setError(lang === 'es' ? 'Esa fecha no está disponible. Por favor elige otra.' : 'That date is not available. Please choose a different date.');
        return;
      }
    }
    setStep(p => p + 1);
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEmailStatus('submitting');
    try {
      const fd = new FormData();
      fd.append('access_key', accessKey);
      fd.append('subject', t.emailSubject);
      fd.append('from_name', emailName);
      fd.append('email', emailEmail);
      fd.append('phone', emailPhone);
      fd.append('message', emailMessage);
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: fd });
      if (res.ok) {
        captureLead({
          source: 'plan',
          language: lang,
          type: s.type,
          date: s.type === 'daytrip' ? s.date : s.checkin,
          checkOut: s.type === 'stay' ? s.checkout : undefined,
          adults: s.adults,
          children: s.children || undefined,
          transport: s.transport,
          food: s.food,
          occasion: s.occasion || undefined,
          name: emailName || undefined,
          email: emailEmail || undefined,
          whatsapp: emailPhone || undefined,
          estimatedPrice: formatCOP(price),
        });
        window.location.href = '/booking/confirm';
      } else { setEmailStatus('error'); }
    } catch { setEmailStatus('error'); }
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-terracotta/15 overflow-hidden">
      {/* Progress bar */}
      <div className="px-6 pt-6 pb-4 border-b border-terracotta/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-ink/40 uppercase tracking-wide">
            {t.stepOf(step)} — {t.stepLabels[step - 1]}
          </span>
          {step > 1 && (
            <button
              onClick={() => { setStep(p => p - 1); setError(null); }}
              className="text-xs text-ink/50 hover:text-ink transition-colors flex items-center gap-1"
            >
              {t.back}
            </button>
          )}
        </div>
        <div className="h-1.5 bg-sand/30 rounded-full overflow-hidden">
          <div className="h-full bg-brown rounded-full transition-all duration-300" style={{ width: `${(step / 6) * 100}%` }} />
        </div>
      </div>

      <div className="p-6 animate-fade-in" key={step}>

        {/* ── Step 1: Type ── */}
        {step === 1 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-2">{t.s1h}</h2>
            <p className="text-sm text-ink/55 mb-6">{t.s1sub}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => update('type', 'daytrip')} className={toggleBtn(s.type === 'daytrip')}>
                <div className="text-2xl mb-2">☀️</div>
                <div className="font-semibold mb-1">{t.dayTitle}</div>
                <div className="text-xs opacity-70 font-normal">{t.dayDesc}</div>
              </button>
              <button onClick={() => update('type', 'stay')} className={toggleBtn(s.type === 'stay')}>
                <div className="text-2xl mb-2">🌙</div>
                <div className="font-semibold mb-1">{t.stayTitle}</div>
                <div className="text-xs opacity-70 font-normal">{t.stayDesc}</div>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 2: Group ── */}
        {step === 2 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-2">{t.s2h}</h2>
            <p className="text-sm text-ink/55 mb-6">{t.s2sub}</p>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">{t.adults}</label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => update('adults', Math.max(1, s.adults - 1))} className={counterBtn}>−</button>
                  <span className="text-xl font-semibold w-8 text-center">{s.adults}</span>
                  <button type="button" onClick={() => update('adults', Math.min(20, s.adults + 1))} className={counterBtn}>+</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">{t.children}</label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => update('children', Math.max(0, s.children - 1))} className={counterBtn}>−</button>
                  <span className="text-xl font-semibold w-8 text-center">{s.children}</span>
                  <button type="button" onClick={() => update('children', s.children + 1)} className={counterBtn}>+</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-3">
                  {t.occasion} <span className="normal-case font-normal text-ink/35">({t.optional})</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {t.occasions.map(occ => (
                    <button
                      key={occ}
                      type="button"
                      onClick={() => update('occasion', s.occasion === occ ? null : occ)}
                      className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all text-left ${
                        s.occasion === occ
                          ? 'bg-brown text-white border-brown'
                          : 'bg-white text-ink border-terracotta/30 hover:border-brown/40'
                      }`}
                    >
                      {occ}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 3: When ── */}
        {step === 3 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-2">{t.s3h}</h2>
            <p className="text-sm text-ink/55 mb-6">{s.type === 'daytrip' ? t.s3subDay : t.s3subStay}</p>
            {s.type === 'daytrip' ? (
              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">{t.dateLabel}</label>
                <input type="date" min={today} value={s.date} onChange={e => update('date', e.target.value)} className={inputCls} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">{t.checkin}</label>
                  <input type="date" min={today} value={s.checkin} onChange={e => update('checkin', e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">{t.checkout}</label>
                  <input type="date" min={s.checkin || today} value={s.checkout} onChange={e => update('checkout', e.target.value)} className={inputCls} />
                </div>
                {nights > 0 && (
                  <p className="col-span-2 text-sm text-brown font-medium">{t.nightsLabel(nights)}</p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Step 4: Transport ── */}
        {step === 4 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-2">{t.s4h}</h2>
            <p className="text-sm text-ink/55 mb-6">{t.s4sub}</p>
            <div className="space-y-3">
              {([
                ['boat', '🚤', t.boatTitle, t.boatDesc],
                ['car_boat', '🚗', t.carTitle, t.carDesc],
                ['own', '🗺️', t.ownTitle, t.ownDesc],
              ] as const).map(([val, emoji, title, desc]) => (
                <button key={val} onClick={() => update('transport', val)} className={`${toggleBtn(s.transport === val)} w-full`}>
                  <div className="flex items-start gap-3">
                    <span className="text-xl">{emoji}</span>
                    <div>
                      <div className="font-semibold">{title}</div>
                      <div className="text-xs opacity-70 font-normal mt-0.5">{desc}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Step 5: Food ── */}
        {step === 5 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-2">{t.s5h}</h2>
            <p className="text-sm text-ink/55 mb-6">{t.s5sub}</p>
            <div className="space-y-3">
              <button onClick={() => update('food', 'service')} className={`${toggleBtn(s.food === 'service')} w-full`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">🍤</span>
                  <div>
                    <div className="font-semibold">{t.svcTitle}</div>
                    <div className="text-xs opacity-70 font-normal mt-0.5">
                      {s.type === 'daytrip' ? t.svcDayDesc : t.svcStayDesc}
                    </div>
                  </div>
                </div>
              </button>
              <button onClick={() => update('food', 'own')} className={`${toggleBtn(s.food === 'own')} w-full`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">🛒</span>
                  <div>
                    <div className="font-semibold">{t.ownFoodTitle}</div>
                    <div className="text-xs opacity-70 font-normal mt-0.5">{t.ownFoodDesc}</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* ── Step 6: Summary ── */}
        {step === 6 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-2">{t.s6h}</h2>
            <p className="text-sm text-ink/55 mb-6">{t.s6sub}</p>

            <div className="bg-sand/20 rounded-xl p-5 mb-6 space-y-2.5">
              <SummaryRow
                label={t.rowExp}
                value={s.type === 'daytrip' ? `☀️ ${t.dayTitle}` : `🌙 ${t.stayTitle}`}
              />
              {s.type === 'daytrip'
                ? <SummaryRow label={t.rowDate} value={s.date || t.waTbd} />
                : <SummaryRow
                    label={t.rowDates}
                    value={s.checkin && s.checkout ? `${s.checkin} → ${s.checkout} (${t.nightsLabel(nights)})` : t.waTbd}
                  />
              }
              <SummaryRow
                label={t.rowGroup}
                value={`${s.adults} ${t.adults.toLowerCase()}${s.children > 0 ? ` + ${s.children} ${t.children.toLowerCase()}` : ''}${s.occasion ? ` · ${s.occasion}` : ''}`}
              />
              <SummaryRow label={t.rowTransport} value={t.transport[s.transport]} />
              <SummaryRow label={t.rowFood} value={t.food[s.food]} />
              <div className="border-t border-terracotta/20 pt-3 mt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-brown">{t.priceLabel}</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-brown">{formatCOP(price)}</div>
                    <div className="text-xs text-ink/50">{formatUSD(price)}</div>
                  </div>
                </div>
                <p className="text-xs text-ink/45 mt-2">{t.priceNote}</p>
              </div>
            </div>

            {/* Primary CTA */}
            <button
              onClick={() => {
                captureLead({
                  source: 'plan',
                  language: lang,
                  type: s.type,
                  date: s.type === 'daytrip' ? s.date : s.checkin,
                  checkOut: s.type === 'stay' ? s.checkout : undefined,
                  adults: s.adults,
                  children: s.children || undefined,
                  transport: s.transport,
                  food: s.food,
                  occasion: s.occasion || undefined,
                  estimatedPrice: formatCOP(price),
                });
                const msg = buildWAMessage(s, t);
                window.open(`https://wa.me/573163946401?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="w-full bg-whatsapp text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition text-sm flex items-center justify-center gap-2 mb-3"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              {t.waBtn}
            </button>

            {/* Secondary CTA */}
            {!showEmailForm ? (
              <button
                onClick={() => { setEmailMessage(buildEmailMessage(s, t)); setShowEmailForm(true); }}
                className="w-full border border-brown text-brown font-semibold py-3.5 rounded-xl hover:bg-brown/5 transition text-sm"
              >
                {t.emailBtn}
              </button>
            ) : (
              <form onSubmit={handleEmailSubmit} className="border border-terracotta/20 rounded-xl p-5 space-y-3 mt-2">
                <p className="text-sm font-semibold text-brown mb-1">{t.emailHeading}</p>
                <input required type="text" value={emailName} onChange={e => setEmailName(e.target.value)} placeholder={t.namePh} className={inputCls} />
                <input required type="email" value={emailEmail} onChange={e => setEmailEmail(e.target.value)} placeholder={t.emailPh} className={inputCls} />
                <input type="tel" value={emailPhone} onChange={e => setEmailPhone(e.target.value)} placeholder={t.phonePh} className={inputCls} />
                <textarea rows={5} value={emailMessage} onChange={e => setEmailMessage(e.target.value)} className={`${inputCls} resize-none`} />
                {emailStatus === 'error' && <p className="text-sm text-red-500">{t.emailError}</p>}
                <button
                  type="submit"
                  disabled={emailStatus === 'submitting'}
                  className="w-full bg-brown text-white font-semibold py-3 rounded-xl hover:opacity-90 transition text-sm disabled:opacity-50"
                >
                  {emailStatus === 'submitting' ? t.emailSending : t.emailSend}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Error */}
        {error && <p className="mt-4 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>}

        {/* Next button (steps 1–5) */}
        {step < 6 && (
          <button onClick={handleNext} className="mt-6 w-full bg-brown text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition text-sm">
            {t.next}
          </button>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs font-semibold text-ink/45 uppercase tracking-wide flex-shrink-0">{label}</span>
      <span className="text-sm text-ink/80 text-right">{value}</span>
    </div>
  );
}
