import { useRef, useState } from 'react';
import { captureLead } from '../lib/leads';
import { publicAnalyticsContext, trackGA4Event } from '../lib/analytics';
import { trackMetaEvent } from '../lib/metaPixel';
import { waLink } from '../lib/whatsapp';
import { daytripEstimate } from '../lib/pricing';
import WhatsAppIcon from './icons/WhatsAppIcon';

type ExperienceType = 'daytrip' | 'stay';
type ContactMethod = 'whatsapp' | 'email';

interface Props {
  lang?: 'en' | 'es';
  defaultType?: ExperienceType;
}

const OCCASION_VALUES = ['family_vacation', 'birthday', 'anniversary', 'friends', 'work_retreat', 'relaxation', 'wedding', 'other'] as const;

const T = {
  en: {
    typeLabel: 'What are you planning?',
    dayOpt: '☀️ Day Trip',
    stayOpt: '🌙 Overnight Stay',
    whenLabel: 'When?',
    checkinLabel: 'Check-in',
    checkoutLabel: 'Check-out',
    adultsLabel: 'Adults',
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
    phoneLabel: 'Your WhatsApp number',
    phonePh: '+57 300 000 0000',
    emailLabel: 'Your email',
    emailPh: 'you@example.com',
    useEmailInstead: 'No WhatsApp? Leave your email instead →',
    useWhatsappInstead: '← Use WhatsApp instead',
    emailSuccess: "✓ Got it — we'll email you back within a few hours.",
    notesLabel: 'Anything else?',
    notesOpt: '(optional)',
    notesPh: 'Birthday, dietary needs, questions…',
    submitBtn: 'Send on WhatsApp →',
    emailSubmitBtn: 'Send →',
    reply: 'We reply within a few hours',
    greeting: 'Hello Casa Gaviota! 👋',
    introDaytrip: "I'd like a private day trip.",
    introStay: "I'd like to plan an overnight stay.",
    dateMsg: 'Date',
    checkinMsg: 'Check-in',
    checkoutMsg: 'Check-out',
    adultsMsg: 'Adults',
    peopleMsg: 'People',
    childrenMsg: 'Children',
    agesMsg: 'Ages',
    occasionMsg: 'Occasion',
    emailMsg: 'My email',
    noteMsg: 'Note',
    tbd: 'TBD',
    footer: 'Sent from casagaviota.com',
  },
  es: {
    typeLabel: '¿Qué estás planeando?',
    dayOpt: '☀️ Pasadía',
    stayOpt: '🌙 Estadía',
    whenLabel: '¿Cuándo?',
    checkinLabel: 'Check-in',
    checkoutLabel: 'Check-out',
    adultsLabel: 'Personas',
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
    phoneLabel: 'Tu número de WhatsApp',
    phonePh: '+57 300 000 0000',
    emailLabel: 'Tu email',
    emailPh: 'tu@ejemplo.com',
    useEmailInstead: '¿No tienes WhatsApp? Deja tu email →',
    useWhatsappInstead: '← Usar WhatsApp',
    emailSuccess: '✓ Listo — te escribimos por email en pocas horas.',
    notesLabel: '¿Algo más?',
    notesOpt: '(opcional)',
    notesPh: 'Cumpleaños, alergias, preguntas…',
    submitBtn: 'Enviar por WhatsApp →',
    emailSubmitBtn: 'Enviar →',
    reply: 'Respondemos en pocas horas',
    greeting: '¡Hola Casa Gaviota! 👋',
    introDaytrip: 'Quiero un pasadía privado.',
    introStay: 'Quiero información sobre estadía.',
    dateMsg: 'Fecha',
    checkinMsg: 'Check-in',
    checkoutMsg: 'Check-out',
    adultsMsg: 'Personas',
    peopleMsg: 'Personas',
    childrenMsg: 'Niños',
    agesMsg: 'Edades',
    occasionMsg: 'Ocasión',
    emailMsg: 'Mi email',
    noteMsg: 'Nota',
    tbd: 'Por confirmar',
    footer: 'Enviado desde casagaviota.com',
  },
};

const inp = 'w-full rounded-xl border border-terracotta/30 bg-white px-4 py-3 text-sm text-ink placeholder-ink/40 focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/15 transition';
const lbl = 'block text-sm font-medium text-ink/70 mb-1.5';

export default function WAInlineForm({ lang = 'en', defaultType = 'stay' }: Props) {
  const t = T[lang];
  const [type, setType] = useState<ExperienceType>(defaultType);
  const [date, setDate] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [ages, setAges] = useState('');
  const [occasion, setOccasion] = useState('');
  const [contactMethod, setContactMethod] = useState<ContactMethod>('whatsapp');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [emailSubmitted, setEmailSubmitted] = useState(false);
  const submissionTrackedRef = useRef(false);

  const today = new Date().toISOString().split('T')[0];

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
    if (contactMethod === 'email' && email.trim()) msg += `${t.emailMsg}: ${email.trim()}\n`;
    if (notes.trim()) msg += `${t.noteMsg}: ${notes.trim()}\n`;
    msg += `\n${t.footer}`;
    return msg;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submissionTrackedRef.current) return;
    setSubmitting(true);
    setSubmitError('');
    const whatsappWindow = contactMethod === 'whatsapp' ? window.open('', '_blank') : null;
    const captured = await captureLead({
      source: type === 'daytrip' ? 'daytrip_form' : 'home_form',
      language: lang,
      type,
      date: type === 'daytrip' ? date : checkin,
      checkOut: type === 'stay' ? checkout : undefined,
      adults,
      children: children > 0 ? children : undefined,
      whatsapp: contactMethod === 'whatsapp' ? (phone || undefined) : undefined,
      email: contactMethod === 'email' ? email.trim() : undefined,
      occasion: occasion || undefined,
      notes: notes || undefined,
      estimatedPrice: type === 'daytrip'
        ? daytripEstimate(adults)
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
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Type toggle */}
      <div>
        <p className={lbl}>{t.typeLabel}</p>
        <div className="grid grid-cols-2 gap-3">
          {(['daytrip', 'stay'] as const).map(opt => (
            <button
              key={opt}
              type="button"
              onClick={() => setType(opt)}
              className={`py-3 px-4 rounded-xl border text-sm font-medium transition-all ${
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

      {/* Date fields */}
      {type === 'daytrip' ? (
        <div>
          <label className={lbl}>{t.whenLabel}</label>
          <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} className={inp} />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className={lbl}>{t.checkinLabel}</label>
            <input type="date" min={today} value={checkin} onChange={e => setCheckin(e.target.value)} className={inp} />
          </div>
          <div>
            <label className={lbl}>{t.checkoutLabel}</label>
            <input type="date" min={checkin || today} value={checkout} onChange={e => setCheckout(e.target.value)} className={inp} />
          </div>
        </div>
      )}

      {/* Adults stepper */}
      <div>
        <label className={lbl}>{t.adultsLabel}</label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setAdults(Math.max(1, adults - 1))}
            className="w-10 h-10 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink transition flex items-center justify-center text-xl leading-none"
          >−</button>
          <span className="text-lg font-semibold w-8 text-center text-ink">{adults}</span>
          <button
            type="button"
            onClick={() => setAdults(Math.min(20, adults + 1))}
            className="w-10 h-10 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink transition flex items-center justify-center text-xl leading-none"
          >+</button>
        </div>
      </div>

      {/* Children stepper */}
      <div>
        <label className={lbl}>
          {t.childrenLabel} <span className="font-normal text-ink/40">({t.childrenSub})</span>
        </label>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setChildren(Math.max(0, children - 1))}
            className="w-10 h-10 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink transition flex items-center justify-center text-xl leading-none"
          >−</button>
          <span className="text-lg font-semibold w-8 text-center text-ink">{children}</span>
          <button
            type="button"
            onClick={() => setChildren(Math.min(20, children + 1))}
            className="w-10 h-10 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink transition flex items-center justify-center text-xl leading-none"
          >+</button>
        </div>
      </div>

      {children > 0 && (
        <div>
          <label className={lbl}>
            {t.agesLabel} <span className="font-normal text-ink/40">{t.agesOptional}</span>
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

      {/* Occasion */}
      <div>
        <label className={lbl}>
          {t.occasionLabel} <span className="font-normal text-ink/40">{t.occasionOptional}</span>
        </label>
        <select value={occasion} onChange={e => setOccasion(e.target.value)} className={inp}>
          <option value="">{t.occasionPlaceholder}</option>
          {OCCASION_VALUES.map(v => (
            <option key={v} value={v}>{t.occasionOptions[v]}</option>
          ))}
        </select>
      </div>

      {/* Contact method */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className={lbl + ' mb-0'}>{contactMethod === 'whatsapp' ? t.phoneLabel : t.emailLabel}</label>
          <button
            type="button"
            onClick={() => setContactMethod(contactMethod === 'whatsapp' ? 'email' : 'whatsapp')}
            className="text-sm font-medium text-terracotta hover:underline"
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

      {/* Notes */}
      <div>
        <label className={lbl}>
          {t.notesLabel} <span className="font-normal text-ink/40">{t.notesOpt}</span>
        </label>
        <textarea
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder={t.notesPh}
          className={inp + ' resize-none'}
        />
      </div>

      {submitError && <p role="alert" className="text-sm text-red-700">{submitError}</p>}

      {emailSubmitted ? (
        <p className="text-center text-sm font-medium text-[#22c55e] py-3">{t.emailSuccess}</p>
      ) : (
        <button
          type="submit"
          disabled={submitting}
          className="w-full font-semibold py-4 rounded-xl text-sm sm:text-base text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          style={{ background: '#25D366' }}
        >
          {contactMethod === 'whatsapp' && <WhatsAppIcon className="w-5 h-5 flex-shrink-0" />}
          {submitting ? (lang === 'es' ? 'Enviando…' : 'Sending…') : (contactMethod === 'whatsapp' ? t.submitBtn : t.emailSubmitBtn)}
        </button>
      )}

      <p className="text-center text-sm text-ink/50">{t.reply}</p>
    </form>
  );
}
