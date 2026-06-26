import { useState } from 'react';

interface Props {
  accessKey: string;
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

const TRANSPORT_LABELS: Record<Transport, string> = {
  boat: 'Lancha privada desde Cartagena',
  car_boat: 'Carro + lancha',
  own: 'Transporte propio',
};
const FOOD_LABELS: Record<Food, string> = {
  service: 'Servicio de comida (Casa Gaviota)',
  own: 'Víveres propios',
};
const STEP_LABELS = ['Type', 'Group', 'When', 'Transport', 'Food', 'Summary'];
const OCCASIONS = [
  { id: 'birthday', label: '🎂 Birthday' },
  { id: 'family', label: '👨‍👩‍👧 Family' },
  { id: 'couple', label: '❤️ Couple' },
  { id: 'friends', label: '🍹 Friends' },
  { id: 'team', label: '🏢 Team day' },
  { id: 'relaxing', label: '😌 Just relaxing' },
];

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

function buildWAMessage(s: State): string {
  const typeLabel = s.type === 'daytrip' ? 'Pasadía (Day Trip)' : 'Estadía (Overnight Stay)';
  const nights = calcNights(s.checkin, s.checkout);
  const dateInfo = s.type === 'daytrip'
    ? (s.date || 'Por confirmar')
    : s.checkin && s.checkout
      ? `${s.checkin} → ${s.checkout} (${nights} noches)`
      : 'Por confirmar';
  const price = s.type === 'daytrip'
    ? calcDayTrip(s.adults, s.transport, s.food)
    : calcStay(nights, s.adults, s.transport, s.food);
  let msg = `Hola Casa Gaviota! 👋\n\nQuiero reservar:\nTipo: ${typeLabel}\nFecha: ${dateInfo}\nAdultos: ${s.adults}`;
  if (s.children > 0) msg += `\nNiños: ${s.children}`;
  msg += `\nTransporte: ${TRANSPORT_LABELS[s.transport]}`;
  msg += `\nComida: ${FOOD_LABELS[s.food]}`;
  if (s.occasion) msg += `\nOcasión: ${s.occasion}`;
  msg += `\n\nPrecio estimado: ${formatCOP(price)}\n\nMi nombre es: (completar)`;
  return msg;
}

function buildEmailMessage(s: State): string {
  const typeLabel = s.type === 'daytrip' ? 'Day Trip (Pasadía)' : 'Overnight Stay (Estadía)';
  const nights = calcNights(s.checkin, s.checkout);
  const dateInfo = s.type === 'daytrip'
    ? (s.date || 'TBD')
    : s.checkin && s.checkout
      ? `${s.checkin} to ${s.checkout} (${nights} nights)`
      : 'TBD';
  const price = s.type === 'daytrip'
    ? calcDayTrip(s.adults, s.transport, s.food)
    : calcStay(nights, s.adults, s.transport, s.food);
  let msg = `Hi, I'm interested in booking Casa Gaviota.\n\nType: ${typeLabel}\nDate: ${dateInfo}\nAdults: ${s.adults}`;
  if (s.children > 0) msg += `\nChildren: ${s.children}`;
  msg += `\nTransport: ${TRANSPORT_LABELS[s.transport]}`;
  msg += `\nFood: ${FOOD_LABELS[s.food]}`;
  if (s.occasion) msg += `\nOccasion: ${s.occasion}`;
  msg += `\n\nEstimated: ${formatCOP(price)} (${formatUSD(price)})\n\nPlease confirm availability and next steps.`;
  return msg;
}

const inp = 'w-full rounded-xl border border-terracotta/30 bg-white px-4 py-3 text-sm text-ink placeholder-ink/40 focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/15 transition';

export default function EscapePlanner({ accessKey }: Props) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
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

  function update<K extends keyof State>(key: K, val: State[K]) {
    setS(prev => ({ ...prev, [key]: val }));
    setError(null);
  }

  const today = new Date().toISOString().split('T')[0];

  function handleNext() {
    setError(null);
    if (step === 3 && s.type === 'stay') {
      if (!s.checkin || !s.checkout) {
        setError('Please select both check-in and check-out dates.');
        return;
      }
      if (calcNights(s.checkin, s.checkout) < 1) {
        setError('Check-out must be at least one day after check-in.');
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
      fd.append('subject', 'Casa Gaviota — Inquiry via EscapePlanner');
      fd.append('from_name', emailName);
      fd.append('email', emailEmail);
      fd.append('phone', emailPhone);
      fd.append('message', emailMessage);
      const res = await fetch('https://api.web3forms.com/submit', { method: 'POST', body: fd });
      if (res.ok) {
        window.location.href = '/booking/confirm';
      } else {
        setEmailStatus('error');
      }
    } catch {
      setEmailStatus('error');
    }
  }

  const nights = calcNights(s.checkin, s.checkout);
  const price = s.type === 'daytrip'
    ? calcDayTrip(s.adults, s.transport, s.food)
    : calcStay(nights, s.adults, s.transport, s.food);

  const toggleBtn = (active: boolean) =>
    `py-3 px-4 rounded-xl border text-sm font-medium transition-all text-left ${
      active ? 'bg-brown text-white border-brown shadow-sm' : 'bg-white text-ink border-terracotta/30 hover:border-brown/40'
    }`;

  const counterBtn = 'w-9 h-9 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink transition flex items-center justify-center text-lg leading-none';

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-terracotta/15 overflow-hidden">
      {/* Progress bar */}
      <div className="px-6 pt-6 pb-4 border-b border-terracotta/10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-ink/40 uppercase tracking-wide">
            Step {step} of 6 — {STEP_LABELS[step - 1]}
          </span>
          {step > 1 && (
            <button
              onClick={() => { setStep(p => p - 1); setError(null); }}
              className="text-xs text-ink/50 hover:text-ink transition-colors flex items-center gap-1"
            >
              ← Back
            </button>
          )}
        </div>
        <div className="h-1.5 bg-sand/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-brown rounded-full transition-all duration-300"
            style={{ width: `${(step / 6) * 100}%` }}
          />
        </div>
      </div>

      <div className="p-6 animate-fade-in" key={step}>
        {/* Step 1: Type */}
        {step === 1 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-2">What are you planning?</h2>
            <p className="text-sm text-ink/55 mb-6">Choose the experience that fits your group.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => update('type', 'daytrip')} className={toggleBtn(s.type === 'daytrip')}>
                <div className="text-2xl mb-2">☀️</div>
                <div className="font-semibold mb-1">Pasadía Privado</div>
                <div className="text-xs opacity-70 font-normal">Day Trip — arrive in the morning, leave by sunset</div>
              </button>
              <button onClick={() => update('type', 'stay')} className={toggleBtn(s.type === 'stay')}>
                <div className="text-2xl mb-2">🌙</div>
                <div className="font-semibold mb-1">Estadía</div>
                <div className="text-xs opacity-70 font-normal">Overnight Stay — sleep to the sound of waves</div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Group */}
        {step === 2 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-2">Your group</h2>
            <p className="text-sm text-ink/55 mb-6">Who is coming?</p>
            <div className="space-y-5">
              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">Adults</label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => update('adults', Math.max(1, s.adults - 1))} className={counterBtn}>−</button>
                  <span className="text-xl font-semibold w-8 text-center">{s.adults}</span>
                  <button type="button" onClick={() => update('adults', Math.min(20, s.adults + 1))} className={counterBtn}>+</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">Children</label>
                <div className="flex items-center gap-4">
                  <button type="button" onClick={() => update('children', Math.max(0, s.children - 1))} className={counterBtn}>−</button>
                  <span className="text-xl font-semibold w-8 text-center">{s.children}</span>
                  <button type="button" onClick={() => update('children', s.children + 1)} className={counterBtn}>+</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-3">Occasion <span className="normal-case font-normal text-ink/35">(optional)</span></label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {OCCASIONS.map(occ => (
                    <button
                      key={occ.id}
                      type="button"
                      onClick={() => update('occasion', s.occasion === occ.label ? null : occ.label)}
                      className={`py-2 px-3 rounded-xl border text-sm font-medium transition-all text-left ${
                        s.occasion === occ.label
                          ? 'bg-brown text-white border-brown'
                          : 'bg-white text-ink border-terracotta/30 hover:border-brown/40'
                      }`}
                    >
                      {occ.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: When */}
        {step === 3 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-2">When?</h2>
            <p className="text-sm text-ink/55 mb-6">
              {s.type === 'daytrip' ? 'Pick the date for your day trip.' : 'Choose your check-in and check-out dates.'}
            </p>
            {s.type === 'daytrip' ? (
              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">Date</label>
                <input
                  type="date"
                  min={today}
                  value={s.date}
                  onChange={e => update('date', e.target.value)}
                  className={inp}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">Check-in</label>
                  <input
                    type="date"
                    min={today}
                    value={s.checkin}
                    onChange={e => update('checkin', e.target.value)}
                    className={inp}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">Check-out</label>
                  <input
                    type="date"
                    min={s.checkin || today}
                    value={s.checkout}
                    onChange={e => update('checkout', e.target.value)}
                    className={inp}
                  />
                </div>
                {s.checkin && s.checkout && nights > 0 && (
                  <p className="col-span-2 text-sm text-brown font-medium">
                    {nights} night{nights !== 1 ? 's' : ''}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Step 4: Transport */}
        {step === 4 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-2">How will you arrive?</h2>
            <p className="text-sm text-ink/55 mb-6">We can help coordinate transport from Cartagena.</p>
            <div className="space-y-3">
              <button onClick={() => update('transport', 'boat')} className={`${toggleBtn(s.transport === 'boat')} w-full`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">🚤</span>
                  <div>
                    <div className="font-semibold">Private boat from Cartagena</div>
                    <div className="text-xs opacity-70 font-normal mt-0.5">~$600.000 COP one way · up to 10 people · fastest option</div>
                  </div>
                </div>
              </button>
              <button onClick={() => update('transport', 'car_boat')} className={`${toggleBtn(s.transport === 'car_boat')} w-full`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">🚗</span>
                  <div>
                    <div className="font-semibold">Car + boat</div>
                    <div className="text-xs opacity-70 font-normal mt-0.5">~$200.000 COP/person one way · min $800.000 COP · most popular</div>
                  </div>
                </div>
              </button>
              <button onClick={() => update('transport', 'own')} className={`${toggleBtn(s.transport === 'own')} w-full`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">🗺️</span>
                  <div>
                    <div className="font-semibold">Own transport</div>
                    <div className="text-xs opacity-70 font-normal mt-0.5">You'll arrange your own way to Barú</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Food */}
        {step === 5 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-2">How about food?</h2>
            <p className="text-sm text-ink/55 mb-6">Fresh Caribbean meals prepared on-site, or bring your own provisions.</p>
            <div className="space-y-3">
              <button onClick={() => update('food', 'service')} className={`${toggleBtn(s.food === 'service')} w-full`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">🍤</span>
                  <div>
                    <div className="font-semibold">Casa Gaviota food service</div>
                    <div className="text-xs opacity-70 font-normal mt-0.5">
                      {s.type === 'daytrip'
                        ? '$150.000 COP/person — fresh Caribbean lunch and snacks'
                        : '$150.000 COP/person/night — breakfast, lunch, and dinner'}
                    </div>
                  </div>
                </div>
              </button>
              <button onClick={() => update('food', 'own')} className={`${toggleBtn(s.food === 'own')} w-full`}>
                <div className="flex items-start gap-3">
                  <span className="text-xl">🛒</span>
                  <div>
                    <div className="font-semibold">Bring your own provisions</div>
                    <div className="text-xs opacity-70 font-normal mt-0.5">Buy groceries in Cartagena and bring them along</div>
                  </div>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 6: Summary */}
        {step === 6 && (
          <div>
            <h2 className="font-serif text-2xl font-semibold text-brown mb-2">Your Private Escape</h2>
            <p className="text-sm text-ink/55 mb-6">Here's your estimate. Pricing is confirmed when we chat.</p>

            {/* Summary card */}
            <div className="bg-sand/20 rounded-xl p-5 mb-6 space-y-2.5">
              <SummaryRow label="Experience" value={s.type === 'daytrip' ? '☀️ Pasadía Privado (Day Trip)' : '🌙 Estadía (Overnight Stay)'} />
              {s.type === 'daytrip'
                ? <SummaryRow label="Date" value={s.date || 'TBD'} />
                : <SummaryRow label="Dates" value={s.checkin && s.checkout ? `${s.checkin} → ${s.checkout} (${nights}n)` : 'TBD'} />
              }
              <SummaryRow label="Group" value={`${s.adults} adults${s.children > 0 ? ` + ${s.children} children` : ''}${s.occasion ? ` · ${s.occasion}` : ''}`} />
              <SummaryRow label="Transport" value={TRANSPORT_LABELS[s.transport]} />
              <SummaryRow label="Food" value={FOOD_LABELS[s.food]} />
              <div className="border-t border-terracotta/20 pt-3 mt-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm font-semibold text-brown">Precio estimado</span>
                  <div className="text-right">
                    <div className="text-xl font-bold text-brown">{formatCOP(price)}</div>
                    <div className="text-xs text-ink/50">{formatUSD(price)}</div>
                  </div>
                </div>
                <p className="text-xs text-ink/45 mt-2">Precio final confirmado por WhatsApp · Este es un estimado</p>
              </div>
            </div>

            {/* Primary CTA: WhatsApp */}
            <button
              onClick={() => {
                const msg = buildWAMessage(s);
                window.open(`https://wa.me/573163946401?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="w-full bg-whatsapp text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition text-sm flex items-center justify-center gap-2 mb-3"
            >
              <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
              Reservar por WhatsApp →
            </button>

            {/* Secondary CTA: email */}
            {!showEmailForm ? (
              <button
                onClick={() => {
                  setEmailMessage(buildEmailMessage(s));
                  setShowEmailForm(true);
                }}
                className="w-full border border-brown text-brown font-semibold py-3.5 rounded-xl hover:bg-brown/5 transition text-sm"
              >
                Enviar consulta por email
              </button>
            ) : (
              <form onSubmit={handleEmailSubmit} className="border border-terracotta/20 rounded-xl p-5 space-y-3 mt-2">
                <p className="text-sm font-semibold text-brown mb-1">Send your inquiry by email</p>
                <input
                  required
                  type="text"
                  value={emailName}
                  onChange={e => setEmailName(e.target.value)}
                  placeholder="Full name"
                  className="w-full rounded-xl border border-terracotta/30 bg-white px-4 py-2.5 text-sm text-ink placeholder-ink/40 focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/15 transition"
                />
                <input
                  required
                  type="email"
                  value={emailEmail}
                  onChange={e => setEmailEmail(e.target.value)}
                  placeholder="Email address"
                  className="w-full rounded-xl border border-terracotta/30 bg-white px-4 py-2.5 text-sm text-ink placeholder-ink/40 focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/15 transition"
                />
                <input
                  type="tel"
                  value={emailPhone}
                  onChange={e => setEmailPhone(e.target.value)}
                  placeholder="Phone / WhatsApp"
                  className="w-full rounded-xl border border-terracotta/30 bg-white px-4 py-2.5 text-sm text-ink placeholder-ink/40 focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/15 transition"
                />
                <textarea
                  rows={5}
                  value={emailMessage}
                  onChange={e => setEmailMessage(e.target.value)}
                  className="w-full rounded-xl border border-terracotta/30 bg-white px-4 py-2.5 text-sm text-ink placeholder-ink/40 focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/15 transition resize-none"
                />
                {emailStatus === 'error' && (
                  <p className="text-sm text-red-500">Something went wrong. Please try WhatsApp instead.</p>
                )}
                <button
                  type="submit"
                  disabled={emailStatus === 'submitting'}
                  className="w-full bg-brown text-white font-semibold py-3 rounded-xl hover:opacity-90 transition text-sm disabled:opacity-50"
                >
                  {emailStatus === 'submitting' ? 'Sending…' : 'Send inquiry →'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="mt-4 text-sm text-red-500 bg-red-50 rounded-xl px-4 py-3">{error}</p>
        )}

        {/* Next button (steps 1-5) */}
        {step < 6 && (
          <button
            onClick={handleNext}
            className="mt-6 w-full bg-brown text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition text-sm"
          >
            Continue →
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
