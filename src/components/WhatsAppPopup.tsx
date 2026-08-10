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
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [blocked, setBlocked] = useState<BlockedRange[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityStale, setAvailabilityStale] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);
  const submissionTrackedRef = useRef(false);

  const t = T[lang];

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ type?: ExperienceType; intentional?: boolean }>).detail;
      if (detail?.type) setType(detail.type);
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
  const canSubmit = hasDateSelected && !dateIsBlocked && !minStayViolated && name.trim().length > 0;

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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit || submitting || submissionTrackedRef.current) return;
    setSubmitting(true);
    setSubmitError('');
    const whatsappWindow = window.open('', '_blank');
    const captured = await captureLead({
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
      content_name: 'WhatsApp Inquiry',
      source: 'popup',
      language: lang,
      experience_type: type,
    });
    sessionStorage.setItem('popup_shown', '1');
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

              {submitError && <p role="alert" className="text-sm text-red-700">{submitError}</p>}

              <button
                type="submit"
                disabled={!canSubmit || submitting}
                className={`w-full font-semibold py-3.5 rounded-xl transition text-sm flex items-center justify-center gap-2 mt-2 ${
                  canSubmit
                    ? 'bg-whatsapp text-white hover:opacity-90'
                    : 'bg-rose text-ink/60 cursor-not-allowed'
                }`}
              >
                <WhatsAppIcon className="w-4 h-4 flex-shrink-0" />
                {submitting ? (lang === 'es' ? 'Enviando…' : 'Sending…') : t.submitBtn}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
