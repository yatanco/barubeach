import { useState } from 'react';
import { captureLead } from '../lib/leads';

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

function daytripEstimate(n: number): string {
  if (n <= 2) return '$300 USD';
  if (n <= 4) return '$500 USD';
  if (n <= 6) return '$700 USD';
  return '$900 USD';
}

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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    captureLead({
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
    window.open(`https://wa.me/573163946401?text=${encodeURIComponent(buildMessage())}`, '_blank');
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

      <button
        type="submit"
        className="w-full font-semibold py-4 rounded-xl text-sm sm:text-base text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
        style={{ background: '#25D366' }}
      >
        <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
        {t.submitBtn}
      </button>

      <p className="text-center text-sm text-ink/50">{t.reply}</p>
    </form>
  );
}
