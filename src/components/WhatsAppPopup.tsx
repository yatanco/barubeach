import { useState, useEffect, useRef } from 'react';
import { captureLead } from '../lib/leads';
import { isDateBlocked, isRangeBlocked, type BlockedRange } from '../lib/availability';
import DateCalendar from './DateCalendar';

type ExperienceType = 'daytrip' | 'stay';

interface Props {
  lang?: 'en' | 'es';
  defaultType?: ExperienceType;
}

const T = {
  en: {
    header: 'Plan your escape 🌴',
    sub: "A few details and we'll reply on WhatsApp within a few hours.",
    typeLabel: 'What are you planning?',
    dayOpt: '☀️ Day Trip',
    stayOpt: '🌙 Overnight',
    whenLabel: 'When?',
    checkinLabel: 'Check-in',
    checkoutLabel: 'Check-out',
    adultsLabel: 'Adults',
    phoneLabel: 'Your WhatsApp number',
    phonePh: '+57 300 000 0000',
    notesLabel: 'Anything else?',
    notesOptional: '(optional)',
    notesPh: 'Birthday, dietary needs, questions…',
    childrenLabel: 'Children',
    childrenSub: 'under 12',
    nameLabel: 'Your name',
    namePh: 'First name',
    childrenMsg: 'Children',
    nameMsg: 'Name',
    submitBtn: 'Send on WhatsApp →',
    introDaytrip: "I'd like a private day trip.",
    introStay: "I'd like to plan an overnight stay.",
    dateMsg: 'Date',
    checkinMsg: 'Check-in',
    checkoutMsg: 'Check-out',
    adultsMsg: 'Adults',
    peopleMsg: 'People',
    waPhoneMsg: 'My WhatsApp',
    noteMsg: 'Note',
    tbd: 'TBD',
    greeting: 'Hello Casa Gaviota! 👋',
    footer: 'Sent from casagaviota.com',
    checkingAvailability: 'Checking availability...',
    dateUnavailableDay: '⚠️ This date is not available. Please choose another date.',
    dateUnavailableRange: '⚠️ Some dates in this range are not available. Please adjust your dates.',
    datesAvailable: '✓ Dates look available',
    availabilityNote: 'Note: availability not verified — please confirm dates.',
    datesVerifiedMsg: 'Dates verified ✓',
  },
  es: {
    header: 'Planea tu escape 🌴',
    sub: 'Cuéntanos lo básico y te respondemos por WhatsApp en pocas horas.',
    typeLabel: '¿Qué estás planeando?',
    dayOpt: '☀️ Pasadía',
    stayOpt: '🌙 Estadía',
    whenLabel: '¿Cuándo?',
    checkinLabel: 'Check-in',
    checkoutLabel: 'Check-out',
    adultsLabel: 'Adultos',
    phoneLabel: 'Tu número de WhatsApp',
    phonePh: '+57 300 000 0000',
    notesLabel: '¿Algo más?',
    notesOptional: '(opcional)',
    notesPh: 'Cumpleaños, alergias, preguntas…',
    childrenLabel: 'Niños',
    childrenSub: 'menores de 12',
    nameLabel: 'Tu nombre',
    namePh: 'Nombre',
    childrenMsg: 'Niños',
    nameMsg: 'Nombre',
    submitBtn: 'Enviar por WhatsApp →',
    introDaytrip: 'Quiero un pasadía privado.',
    introStay: 'Quiero información sobre estadía.',
    dateMsg: 'Fecha',
    checkinMsg: 'Check-in',
    checkoutMsg: 'Check-out',
    adultsMsg: 'Adultos',
    peopleMsg: 'Personas',
    waPhoneMsg: 'Mi WhatsApp',
    noteMsg: 'Nota',
    tbd: 'Por confirmar',
    greeting: 'Hola Casa Gaviota! 👋',
    footer: 'Enviado desde casagaviota.com',
    checkingAvailability: 'Verificando disponibilidad...',
    dateUnavailableDay: '⚠️ Esta fecha no está disponible. Por favor elige otra fecha.',
    dateUnavailableRange: '⚠️ Algunas fechas en este rango no están disponibles.',
    datesAvailable: '✓ Fechas aparentemente disponibles',
    availabilityNote: 'Nota: disponibilidad pendiente de confirmación.',
    datesVerifiedMsg: 'Fechas verificadas ✓',
  },
};

const WA_ICON = (
  <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const WA_ICON_SM = (
  <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

const inp = 'w-full rounded-xl border border-terracotta/30 bg-white px-4 py-2.5 text-sm text-ink placeholder-ink/40 focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/15 transition';

function daytripEstimate(n: number): string {
  if (n <= 2) return '$300 USD';
  if (n <= 4) return '$500 USD';
  if (n <= 6) return '$700 USD';
  return '$900 USD';
}

export default function WhatsAppPopup({ lang = 'en', defaultType = 'daytrip' }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ExperienceType>(defaultType);
  const [date, setDate] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [blocked, setBlocked] = useState<BlockedRange[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityStale, setAvailabilityStale] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);

  const t = T[lang];

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ type?: ExperienceType }>).detail;
      if (detail?.type) setType(detail.type);
      setOpen(true);
    };
    window.addEventListener('open-wa-popup', handler);
    return () => window.removeEventListener('open-wa-popup', handler);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setAvailabilityLoading(true);
    setAvailabilityStale(false);
    fetch('/api/availability')
      .then(res => res.json())
      .then((data: { blocked?: BlockedRange[]; stale?: boolean }) => {
        if (cancelled) return;
        setBlocked(Array.isArray(data.blocked) ? data.blocked : []);
        setAvailabilityStale(Boolean(data.stale));
      })
      .catch(() => {
        if (cancelled) return;
        setBlocked([]);
        setAvailabilityStale(true);
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const hasDateSelected = type === 'daytrip' ? Boolean(date) : Boolean(checkin && checkout);
  const dateIsBlocked =
    !availabilityLoading &&
    !availabilityStale &&
    (type === 'daytrip'
      ? Boolean(date) && isDateBlocked(new Date(date), blocked)
      : Boolean(checkin && checkout) && isRangeBlocked(new Date(checkin), new Date(checkout), blocked));
  const datesVerifiedAvailable = !availabilityLoading && !availabilityStale && hasDateSelected && !dateIsBlocked;
  const canSubmit = hasDateSelected && !dateIsBlocked && name.trim().length > 0;

  function buildMessage(): string {
    const intro = type === 'daytrip' ? t.introDaytrip : t.introStay;
    let msg = `${t.greeting}\n${intro}\n`;
    if (type === 'daytrip') {
      msg += `${t.dateMsg}: ${date || t.tbd}\n`;
      msg += `${t.peopleMsg}: ${adults}\n`;
    } else {
      msg += `${t.checkinMsg}: ${checkin || t.tbd}\n`;
      msg += `${t.checkoutMsg}: ${checkout || t.tbd}\n`;
      msg += `${t.adultsMsg}: ${adults}\n`;
    }
    if (children > 0) msg += `${t.childrenMsg}: ${children}\n`;
    if (name.trim()) msg += `${t.nameMsg}: ${name.trim()}\n`;
    if (notes.trim()) msg += `${t.noteMsg}: ${notes.trim()}\n`;
    if (hasDateSelected) {
      if (availabilityStale) {
        msg += `${t.availabilityNote}\n`;
      } else if (datesVerifiedAvailable) {
        msg += `${t.datesVerifiedMsg}\n`;
      }
    }
    msg += `\n${t.footer}`;
    return msg;
  }

  function closePopup() {
    setOpen(false);
    setDate('');
    setCheckin('');
    setCheckout('');
    setAdults(2);
    setChildren(0);
    setName('');
    setPhone('');
    setNotes('');
    setType(defaultType);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    captureLead({
      source: 'popup',
      language: lang,
      type,
      date: type === 'daytrip' ? date : checkin,
      checkOut: type === 'stay' ? checkout : undefined,
      adults,
      children: children > 0 ? children : undefined,
      name: name || undefined,
      whatsapp: phone || undefined,
      notes: notes || undefined,
      estimatedPrice: type === 'daytrip'
        ? daytripEstimate(adults)
        : 'From $350 USD/night + transport + food',
    });
    sessionStorage.setItem('popup_shown', '1');
    window.open(`https://wa.me/573163946401?text=${encodeURIComponent(buildMessage())}`, '_blank');
    closePopup();
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) closePopup();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Contact via WhatsApp"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-whatsapp text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
      >
        {WA_ICON}
      </button>

      {open && (
        <div
          ref={overlayRef}
          onClick={handleOverlayClick}
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm"
        >
          <div className="fixed left-0 right-0 bottom-0 md:left-auto md:right-4 md:bottom-20 w-full md:w-[420px] max-h-[90vh] overflow-y-auto bg-white rounded-t-2xl md:rounded-2xl shadow-2xl animate-slide-up">
            <div className="sticky top-0 z-10 bg-white px-6 pt-6 pb-4 border-b border-terracotta/10">
              <button
                onClick={closePopup}
                className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center text-ink/40 hover:text-ink transition-colors text-xl"
                aria-label="Close"
              >
                ×
              </button>

              <h3 className="font-serif text-xl font-semibold text-brown mb-1 pr-8">{t.header}</h3>
              <p className="text-sm text-ink/55 mb-4">{t.sub}</p>

              <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">{t.typeLabel}</p>
              <div className="grid grid-cols-2 gap-2">
                {(['daytrip', 'stay'] as const).map(opt => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setType(opt)}
                    className={`py-2.5 px-3 rounded-xl border text-sm font-medium transition-all text-left ${
                      type === opt
                        ? 'bg-brown text-white border-brown shadow-sm'
                        : 'bg-white text-ink border-terracotta/30 hover:border-brown/40'
                    }`}
                  >
                    {opt === 'daytrip' ? t.dayOpt : t.stayOpt}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="px-6 pb-6 pt-4 space-y-4">
              {type === 'daytrip' ? (
                <div>
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">{t.whenLabel}</label>
                  <DateCalendar lang={lang} mode="single" blocked={blocked} value={date} onChange={setDate} />
                  {availabilityLoading && (
                    <p className="mt-1 text-xs text-ink/40">{t.checkingAvailability}</p>
                  )}
                  {!availabilityLoading && !availabilityStale && date && dateIsBlocked && (
                    <p className="mt-1 text-xs text-[#B28471]">{t.dateUnavailableDay}</p>
                  )}
                  {datesVerifiedAvailable && (
                    <p className="mt-1 text-xs text-[#22c55e]">{t.datesAvailable}</p>
                  )}
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">{t.whenLabel}</label>
                  <DateCalendar
                    lang={lang}
                    mode="range"
                    blocked={blocked}
                    checkin={checkin}
                    checkout={checkout}
                    onChangeCheckin={setCheckin}
                    onChangeCheckout={setCheckout}
                  />
                  <div className="flex justify-between text-xs text-ink/60 mt-2">
                    <span>{t.checkinLabel}: {checkin || '—'}</span>
                    <span>{t.checkoutLabel}: {checkout || '—'}</span>
                  </div>
                  {availabilityLoading && (
                    <p className="mt-1 text-xs text-ink/40">{t.checkingAvailability}</p>
                  )}
                  {!availabilityLoading && !availabilityStale && checkin && checkout && dateIsBlocked && (
                    <p className="mt-1 text-xs text-[#B28471]">{t.dateUnavailableRange}</p>
                  )}
                  {datesVerifiedAvailable && (
                    <p className="mt-1 text-xs text-[#22c55e]">{t.datesAvailable}</p>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">{t.adultsLabel}</label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    className="w-9 h-9 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink transition flex items-center justify-center text-lg leading-none"
                  >−</button>
                  <span className="text-base font-semibold w-6 text-center text-ink">{adults}</span>
                  <button
                    type="button"
                    onClick={() => setAdults(Math.min(20, adults + 1))}
                    className="w-9 h-9 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink transition flex items-center justify-center text-lg leading-none"
                  >+</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">
                  {t.childrenLabel} <span className="normal-case font-normal text-ink/35">({t.childrenSub})</span>
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setChildren(Math.max(0, children - 1))}
                    className="w-9 h-9 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink transition flex items-center justify-center text-lg leading-none"
                  >−</button>
                  <span className="text-base font-semibold w-6 text-center text-ink">{children}</span>
                  <button
                    type="button"
                    onClick={() => setChildren(Math.min(20, children + 1))}
                    className="w-9 h-9 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink transition flex items-center justify-center text-lg leading-none"
                  >+</button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">{t.nameLabel}</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder={t.namePh}
                  className={inp}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">{t.notesLabel} <span className="normal-case font-normal text-ink/35">{t.notesOptional}</span></label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder={t.notesPh}
                  className={inp}
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className={`w-full font-semibold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2 mt-2 ${
                  canSubmit
                    ? 'bg-whatsapp text-white hover:opacity-90'
                    : 'bg-rose text-ink/60 cursor-not-allowed'
                }`}
              >
                {WA_ICON_SM}
                {t.submitBtn}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
