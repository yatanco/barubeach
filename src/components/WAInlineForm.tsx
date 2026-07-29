import { useRef, useState } from 'react';
import { captureLead } from '../lib/leads';
import { publicAnalyticsContext, trackGA4Event } from '../lib/analytics';
import { trackMetaEvent } from '../lib/metaPixel';
import { waLink } from '../lib/whatsapp';
import { daytripEstimate } from '../lib/pricing';
import WhatsAppIcon from './icons/WhatsAppIcon';

type ExperienceType = 'daytrip' | 'stay';

interface Props {
  lang?: 'en' | 'es';
  defaultType?: ExperienceType;
}

const T = {
  en: {
    typeLabel: 'What are you planning?',
    dayOpt: '☀️ Day Trip',
    stayOpt: '🌙 Overnight Stay',
    whenLabel: 'When?',
    checkinLabel: 'Check-in',
    checkoutLabel: 'Check-out',
    adultsLabel: 'Adults',
    phoneLabel: 'Your WhatsApp number',
    phonePh: '+57 300 000 0000',
    notesLabel: 'Anything else?',
    notesOpt: '(optional)',
    notesPh: 'Birthday, dietary needs, questions…',
    submitBtn: 'Send on WhatsApp →',
    reply: 'We reply within a few hours',
    greeting: 'Hello Casa Gaviota! 👋',
    introDaytrip: "I'd like a private day trip.",
    introStay: "I'd like to plan an overnight stay.",
    dateMsg: 'Date',
    checkinMsg: 'Check-in',
    checkoutMsg: 'Check-out',
    adultsMsg: 'Adults',
    peopleMsg: 'People',
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
    phoneLabel: 'Tu número de WhatsApp',
    phonePh: '+57 300 000 0000',
    notesLabel: '¿Algo más?',
    notesOpt: '(opcional)',
    notesPh: 'Cumpleaños, alergias, preguntas…',
    submitBtn: 'Enviar por WhatsApp →',
    reply: 'Respondemos en pocas horas',
    greeting: '¡Hola Casa Gaviota! 👋',
    introDaytrip: 'Quiero un pasadía privado.',
    introStay: 'Quiero información sobre estadía.',
    dateMsg: 'Fecha',
    checkinMsg: 'Check-in',
    checkoutMsg: 'Check-out',
    adultsMsg: 'Personas',
    peopleMsg: 'Personas',
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
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
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
    if (notes.trim()) msg += `${t.noteMsg}: ${notes.trim()}\n`;
    msg += `\n${t.footer}`;
    return msg;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting || submissionTrackedRef.current) return;
    setSubmitting(true);
    setSubmitError('');
    const whatsappWindow = window.open('', '_blank');
    const captured = await captureLead({
      source: type === 'daytrip' ? 'daytrip_form' : 'home_form',
      language: lang,
      type,
      date: type === 'daytrip' ? date : checkin,
      checkOut: type === 'stay' ? checkout : undefined,
      adults,
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

      {/* WhatsApp number */}
      <div>
        <label className={lbl}>{t.phoneLabel}</label>
        <input
          type="tel"
          autoComplete="tel"
          value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder={t.phonePh}
          className={inp}
        />
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

      <button
        type="submit"
        disabled={submitting}
        className="w-full font-semibold py-4 rounded-xl text-sm sm:text-base text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        style={{ background: '#25D366' }}
      >
        <WhatsAppIcon className="w-5 h-5 flex-shrink-0" />
        {submitting ? (lang === 'es' ? 'Enviando…' : 'Sending…') : t.submitBtn}
      </button>

      <p className="text-center text-sm text-ink/50">{t.reply}</p>
    </form>
  );
}
