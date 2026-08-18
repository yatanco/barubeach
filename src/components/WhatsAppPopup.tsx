import { useState, useEffect, useRef } from 'react';
import { captureLead } from '../lib/leads';
import { isDateBlocked, isRangeBlocked, violatesWeekendMinStay, type BlockedRange } from '../lib/availability';
import { trackMetaEvent } from '../lib/metaPixel';
import { publicAnalyticsContext, trackGA4Event } from '../lib/analytics';
import { waLink } from '../lib/whatsapp';
import { daytripEstimate } from '../lib/pricing';
import DateCalendar from './DateCalendar';
import WhatsAppIcon from './icons/WhatsAppIcon';

type ExperienceType = 'daytrip' | 'stay';
type ContactMethod = 'whatsapp' | 'email';
type CartTransport = 'boat' | 'car_boat';

export interface CartDetail {
  foodOn: boolean;
  people: number;
  days: number;
  foodSubtotal: number;
  transport: CartTransport;
  transportSubtotal: number;
  extrasTotal: number;
}

interface Props {
  lang?: 'en' | 'es';
  defaultType?: ExperienceType;
}

const OCCASION_VALUES = ['family_vacation', 'birthday', 'anniversary', 'friends', 'work_retreat', 'relaxation', 'wedding', 'other'] as const;

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
    agesLabel: 'Ages',
    agesOptional: '(optional)',
    agesPh: 'e.g. 5, 8, 12',
    occasionLabel: 'What are you celebrating?',
    occasionOptional: '(optional)',
    occasionPlaceholder: 'Select one…',
    occasionOptions: {
      family_vacation: 'Family vacation', birthday: 'Birthday', anniversary: 'Anniversary',
      friends: 'Trip with friends', work_retreat: 'Team / work retreat', relaxation: 'Just relaxing',
      wedding: 'Wedding', other: 'Other',
    },
    nameLabel: 'Your name',
    namePh: 'First name',
    childrenMsg: 'Children',
    agesMsg: 'Ages',
    occasionMsg: 'Occasion',
    nameMsg: 'Name',
    submitBtn: 'Send on WhatsApp →',
    emailSubmitBtn: 'Send →',
    sending: 'Sending…',
    useEmailInstead: 'No WhatsApp? Leave your email instead →',
    useWhatsappInstead: '← Use WhatsApp instead',
    emailLabel: 'Your email',
    emailPh: 'you@example.com',
    emailSuccess: "✓ Got it — we'll email you back within a few hours.",
    introDaytrip: "I'd like a private day trip.",
    introStay: "I'd like to plan an overnight stay.",
    dateMsg: 'Date',
    checkinMsg: 'Check-in',
    checkoutMsg: 'Check-out',
    adultsMsg: 'Adults',
    peopleMsg: 'People',
    waPhoneMsg: 'My WhatsApp',
    emailMsg: 'My email',
    noteMsg: 'Note',
    tbd: 'TBD',
    greeting: 'Hello Casa Gaviota! 👋',
    footer: 'Sent from casagaviota.com',
    foodCartOn: (people: number, days: number) => `Food service — ${people} people × ${days} days ($50/person/day)`,
    foodCartOff: 'Bringing own food',
    transportCartMsg: 'Transport',
    boatLabel: 'Private boat',
    carLabel: 'Car + boat',
    extrasCartMsg: 'Extras estimate',
    accommodationNote: 'Accommodation depends on dates — to be confirmed on WhatsApp.',
    checkingAvailability: 'Checking availability...',
    dateUnavailableDay: '⚠️ This date is not available. Please choose another date.',
    dateUnavailableRange: '⚠️ Some dates in this range are not available. Please adjust your dates.',
    datesAvailable: '✓ Dates look available',
    availabilityNote: 'Note: availability not verified — please confirm dates.',
    datesVerifiedMsg: 'Dates verified ✓',
    weekendMinStay: 'Weekend nights (Fri/Sat) require a 2-night minimum stay.',
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
    agesLabel: 'Edades',
    agesOptional: '(opcional)',
    agesPh: 'ej. 5, 8, 12',
    occasionLabel: '¿Qué están celebrando?',
    occasionOptional: '(opcional)',
    occasionPlaceholder: 'Selecciona uno…',
    occasionOptions: {
      family_vacation: 'Vacaciones familiares', birthday: 'Cumpleaños', anniversary: 'Aniversario',
      friends: 'Viaje con amigos', work_retreat: 'Retiro de trabajo / equipo', relaxation: 'Solo relajarnos',
      wedding: 'Boda', other: 'Otro',
    },
    nameLabel: 'Tu nombre',
    namePh: 'Nombre',
    childrenMsg: 'Niños',
    agesMsg: 'Edades',
    occasionMsg: 'Ocasión',
    nameMsg: 'Nombre',
    submitBtn: 'Enviar por WhatsApp →',
    emailSubmitBtn: 'Enviar →',
    sending: 'Enviando…',
    useEmailInstead: '¿No tienes WhatsApp? Deja tu email →',
    useWhatsappInstead: '← Usar WhatsApp',
    emailLabel: 'Tu email',
    emailPh: 'tu@ejemplo.com',
    emailSuccess: '✓ Listo — te escribimos por email en pocas horas.',
    introDaytrip: 'Quiero un pasadía privado.',
    introStay: 'Quiero información sobre estadía.',
    dateMsg: 'Fecha',
    checkinMsg: 'Check-in',
    checkoutMsg: 'Check-out',
    adultsMsg: 'Adultos',
    peopleMsg: 'Personas',
    waPhoneMsg: 'Mi WhatsApp',
    emailMsg: 'Mi email',
    noteMsg: 'Nota',
    tbd: 'Por confirmar',
    greeting: 'Hola Casa Gaviota! 👋',
    footer: 'Enviado desde casagaviota.com',
    foodCartOn: (people: number, days: number) => `Servicio de comida — ${people} personas × ${days} días ($50/persona/día)`,
    foodCartOff: 'Traen su propia comida',
    transportCartMsg: 'Transporte',
    boatLabel: 'Lancha privada',
    carLabel: 'Carro + lancha',
    extrasCartMsg: 'Estimado de extras',
    accommodationNote: 'El alojamiento depende de las fechas — se confirma por WhatsApp.',
    checkingAvailability: 'Verificando disponibilidad...',
    dateUnavailableDay: '⚠️ Esta fecha no está disponible. Por favor elige otra fecha.',
    dateUnavailableRange: '⚠️ Algunas fechas en este rango no están disponibles.',
    datesAvailable: '✓ Fechas aparentemente disponibles',
    availabilityNote: 'Nota: disponibilidad pendiente de confirmación.',
    datesVerifiedMsg: 'Fechas verificadas ✓',
    weekendMinStay: 'Las noches de fin de semana (vie/sáb) requieren una estadía mínima de 2 noches.',
  },
};

const inp = 'w-full rounded-xl border border-terracotta/30 bg-white px-4 py-2.5 text-sm text-ink placeholder-ink/40 focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/15 transition';

export default function WhatsAppPopup({ lang = 'en', defaultType = 'daytrip' }: Props) {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ExperienceType>(defaultType);
  const [date, setDate] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [ages, setAges] = useState('');
  const [occasion, setOccasion] = useState('');
  const [name, setName] = useState('');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('whatsapp');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [cart, setCart] = useState<CartDetail | null>(null);
  const [blocked, setBlocked] = useState<BlockedRange[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityStale, setAvailabilityStale] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const submissionTrackedRef = useRef(false);

  const t = T[lang];

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ type?: ExperienceType; intentional?: boolean; cart?: CartDetail }>).detail;
      if (detail?.type) setType(detail.type);
      if (detail?.cart) {
        setCart(detail.cart);
        setAdults(detail.cart.people);
      }
      submissionTrackedRef.current = false;
      setSubmitError('');
      if (detail?.intentional !== false) {
        trackGA4Event('lead_form_open', {
          form_name: 'availability_enquiry',
          language: lang,
          page_path: window.location.pathname,
        });
      }
      setOpen(true);
    };
    window.addEventListener('open-wa-popup', handler);
    return () => window.removeEventListener('open-wa-popup', handler);
  }, [lang]);

  useEffect(() => {
    if (!open) return;
    trackMetaEvent('WhatsAppPopupOpen', {
      source: 'popup',
      language: lang,
      experience_type: type,
    }, true);

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
  const minStayViolated = type === 'stay' && Boolean(checkin && checkout) && violatesWeekendMinStay(checkin, checkout);
  const canSubmit = hasDateSelected && !dateIsBlocked && !minStayViolated && name.trim().length > 0
    && (contactMethod === 'whatsapp' || email.trim().length > 0);

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
    if (children > 0 && ages.trim()) msg += `${t.agesMsg}: ${ages.trim()}\n`;
    if (occasion) msg += `${t.occasionMsg}: ${t.occasionOptions[occasion as keyof typeof t.occasionOptions]}\n`;
    if (name.trim()) msg += `${t.nameMsg}: ${name.trim()}\n`;
    if (contactMethod === 'email' && email.trim()) msg += `${t.emailMsg}: ${email.trim()}\n`;
    if (cart) {
      msg += `${cart.foodOn ? t.foodCartOn(cart.people, cart.days) : t.foodCartOff}\n`;
      msg += `${t.transportCartMsg}: ${cart.transport === 'boat' ? t.boatLabel : t.carLabel} ($${cart.transportSubtotal} USD)\n`;
      msg += `${t.extrasCartMsg}: $${cart.extrasTotal} USD\n`;
      msg += `${t.accommodationNote}\n`;
    }
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

  function cartNotesSummary(): string {
    if (!cart) return '';
    const foodLine = cart.foodOn ? t.foodCartOn(cart.people, cart.days) : t.foodCartOff;
    const transportLine = `${t.transportCartMsg}: ${cart.transport === 'boat' ? t.boatLabel : t.carLabel} ($${cart.transportSubtotal} USD)`;
    return `${foodLine}. ${transportLine}. ${t.extrasCartMsg}: $${cart.extrasTotal} USD.`;
  }

  function closePopup() {
    setOpen(false);
    setDate('');
    setCheckin('');
    setCheckout('');
    setAdults(2);
    setChildren(0);
    setAges('');
    setOccasion('');
    setName('');
    setContactMethod('whatsapp');
    setPhone('');
    setEmail('');
    setNotes('');
    setCart(null);
    setEmailSubmitted(false);
    setType(defaultType);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting || submissionTrackedRef.current) return;
    setSubmitting(true);
    setSubmitError('');
    const whatsappWindow = contactMethod === 'whatsapp' ? window.open('', '_blank') : null;
    const cartNotes = cartNotesSummary();
    const combinedNotes = [cartNotes, notes.trim()].filter(Boolean).join(' ') || undefined;
    const captured = await captureLead({
      source: 'popup',
      language: lang,
      type,
      date: type === 'daytrip' ? date : checkin,
      checkOut: type === 'stay' ? checkout : undefined,
      adults,
      children: children > 0 ? children : undefined,
      name: name || undefined,
      whatsapp: contactMethod === 'whatsapp' ? (phone || undefined) : undefined,
      email: contactMethod === 'email' ? email.trim() : undefined,
      occasion: occasion || undefined,
      notes: combinedNotes,
      estimatedPrice: type === 'daytrip'
        ? daytripEstimate(adults)
        : cart
          ? `Extras: $${cart.extrasTotal} USD (food+transport) — accommodation TBD by dates`
          : 'Accommodation depends on dates',
    });
    if (!captured) {
      whatsappWindow?.close();
      setSubmitError(lang === 'es'
        ? 'No pudimos guardar tu solicitud. Intenta de nuevo.'
        : 'We could not save your enquiry. Please try again.');
      setSubmitting(false);
      return;
    }
    submissionTrackedRef.current = true;
    const analyticsContext = publicAnalyticsContext(lang, type);
    trackGA4Event('generate_lead', {
      currency: 'COP',
      form_name: 'availability_enquiry',
      ...analyticsContext,
    });
    trackMetaEvent('Lead');
    trackMetaEvent('Contact', {
      content_name: contactMethod === 'whatsapp' ? 'WhatsApp Inquiry' : 'Email Inquiry',
      source: 'popup',
      language: lang,
      experience_type: type,
    });
    sessionStorage.setItem('popup_shown', '1');

    if (contactMethod === 'email') {
      setSubmitting(false);
      setEmailSubmitted(true);
      return;
    }

    trackGA4Event('whatsapp_click', {
      link_type: 'whatsapp',
      ...analyticsContext,
    });
    const whatsappUrl = waLink(buildMessage());
    if (whatsappWindow) whatsappWindow.location.href = whatsappUrl;
    else window.location.href = whatsappUrl;
    setSubmitting(false);
    closePopup();
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) closePopup();
  }

  return (
    <>
      <button
        onClick={() => {
          submissionTrackedRef.current = false;
          setSubmitError('');
          trackGA4Event('lead_form_open', {
            form_name: 'availability_enquiry',
            language: lang,
            page_path: window.location.pathname,
          });
          setOpen(true);
        }}
        aria-label="Contact via WhatsApp"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-whatsapp text-white shadow-lg hover:scale-105 transition-transform flex items-center justify-center"
      >
        <WhatsAppIcon className="w-7 h-7" />
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
              {cart && (
                <div className="rounded-xl border border-terracotta/20 bg-sand/15 px-4 py-3 text-xs text-ink/70">
                  <p className="font-semibold text-brown mb-1">{t.extrasCartMsg}: ${cart.extrasTotal} USD</p>
                  <p>{cart.foodOn ? t.foodCartOn(cart.people, cart.days) : t.foodCartOff}</p>
                  <p>{t.transportCartMsg}: {cart.transport === 'boat' ? t.boatLabel : t.carLabel} (${cart.transportSubtotal} USD)</p>
                </div>
              )}
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
                  {(minStayViolated || (checkin && !checkout && [5, 6].includes(new Date(checkin).getUTCDay()))) && (
                    <p className="mt-1 text-xs text-[#B28471]">{t.weekendMinStay}</p>
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

              {children > 0 && (
                <div>
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">
                    {t.agesLabel} <span className="normal-case font-normal text-ink/35">{t.agesOptional}</span>
                  </label>
                  <input
                    type="text"
                    value={ages}
                    onChange={e => setAges(e.target.value)}
                    placeholder={t.agesPh}
                    className={inp}
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">
                  {t.occasionLabel} <span className="normal-case font-normal text-ink/35">{t.occasionOptional}</span>
                </label>
                <select
                  value={occasion}
                  onChange={e => setOccasion(e.target.value)}
                  className={inp}
                >
                  <option value="">{t.occasionPlaceholder}</option>
                  {OCCASION_VALUES.map(v => (
                    <option key={v} value={v}>{t.occasionOptions[v]}</option>
                  ))}
                </select>
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
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide">
                    {contactMethod === 'whatsapp' ? t.phoneLabel : t.emailLabel}
                  </label>
                  <button
                    type="button"
                    onClick={() => setContactMethod(contactMethod === 'whatsapp' ? 'email' : 'whatsapp')}
                    className="text-xs font-medium text-terracotta hover:underline"
                  >
                    {contactMethod === 'whatsapp' ? t.useEmailInstead : t.useWhatsappInstead}
                  </button>
                </div>
                {contactMethod === 'whatsapp' ? (
                  <input
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder={t.phonePh}
                    className={inp}
                  />
                ) : (
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder={t.emailPh}
                    className={inp}
                  />
                )}
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

              {submitError && <p role="alert" className="text-sm text-red-700">{submitError}</p>}

              {emailSubmitted ? (
                <p className="text-center text-sm font-medium text-[#22c55e] py-3">{t.emailSuccess}</p>
              ) : (
                <button
                  type="submit"
                  disabled={!canSubmit || submitting}
                  className={`w-full font-semibold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2 mt-2 ${
                    canSubmit
                      ? 'bg-whatsapp text-white hover:opacity-90'
                      : 'bg-rose text-ink/60 cursor-not-allowed'
                  }`}
                >
                  {contactMethod === 'whatsapp' && <WhatsAppIcon className="w-4 h-4 flex-shrink-0" />}
                  {submitting ? t.sending : (contactMethod === 'whatsapp' ? t.submitBtn : t.emailSubmitBtn)}
                </button>
              )}
            </form>
          </div>
        </div>
      )}
    </>
  );
}
