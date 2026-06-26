import { useState } from 'react';

interface Props {
  accessKey: string;
  lang?: 'en' | 'es';
  defaultType?: 'stay' | 'daytrip';
}

type Status = 'idle' | 'submitting' | 'error' | 'validation-error';

const T = {
  en: {
    typeLabel: 'What are you planning?',
    daytrip: '☀️ Day Trip',
    stay: '🌙 Overnight Stay',
    date: 'Trip date',
    checkin: 'Check-in date',
    checkout: 'Check-out date',
    guests: 'Number of guests',
    name: 'Full name',
    email: 'Email address',
    phone: 'Phone / WhatsApp',
    notes: 'Occasion or notes (optional)',
    submit: 'Send inquiry',
    submitting: 'Sending…',
    error: 'Something went wrong. Please try again.',
    required: 'Please fill in all required fields.',
    or: 'Or write to us directly on',
    whatsapp: 'WhatsApp',
  },
  es: {
    typeLabel: '¿Qué estás planeando?',
    daytrip: '☀️ Pasadía',
    stay: '🌙 Estadía',
    date: 'Fecha del pasadía',
    checkin: 'Fecha de llegada',
    checkout: 'Fecha de salida',
    guests: 'Número de personas',
    name: 'Nombre completo',
    email: 'Correo electrónico',
    phone: 'Teléfono / WhatsApp',
    notes: 'Ocasión o notas (opcional)',
    submit: 'Enviar consulta',
    submitting: 'Enviando…',
    error: 'Algo salió mal. Inténtalo de nuevo.',
    required: 'Por favor completa todos los campos requeridos.',
    or: 'O escríbenos directamente por',
    whatsapp: 'WhatsApp',
  },
};

export default function InquiryForm({ accessKey, lang = 'en', defaultType = 'stay' }: Props) {
  const t = T[lang];
  const [type, setType] = useState<'stay' | 'daytrip'>(defaultType);
  const [date, setDate] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [guests, setGuests] = useState('2');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const today = new Date().toISOString().split('T')[0];
  const maxGuests = type === 'daytrip' ? 20 : 12;
  const waText = type === 'daytrip' ? 'gaviotadaytrip' : 'gaviotastay';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const dateOk = type === 'stay' ? (checkin && checkout) : date;
    if (!dateOk || !name || !email || !phone) {
      setStatus('validation-error');
      return;
    }
    setStatus('submitting');
    try {
      const res = await fetch('https://api.web3forms.com/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: accessKey,
          subject: `New ${type === 'daytrip' ? 'Day Trip' : 'Stay'} Inquiry — ${name}`,
          from_name: 'Casa Gaviota Website',
          experience: type === 'daytrip' ? 'Day Trip' : 'Overnight Stay',
          ...(type === 'stay' ? { checkin, checkout } : { date }),
          guests,
          name,
          email,
          phone,
          notes,
        }),
      });
      const data = await res.json();
      if (data.success) {
        window.location.href = '/booking/confirm';
      } else {
        setStatus('error');
      }
    } catch {
      setStatus('error');
    }
  }

  const inp = 'w-full rounded-xl border border-sand/40 bg-white px-4 py-3 text-sm text-ink placeholder-ink/40 focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20 transition';
  const lbl = 'block text-sm font-medium text-ink/70 mb-1.5';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Experience toggle */}
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
                  ? 'bg-ocean text-white border-ocean shadow-sm'
                  : 'bg-white text-ink border-sand/40 hover:border-ocean/40'
              }`}
            >
              {opt === 'daytrip' ? t.daytrip : t.stay}
            </button>
          ))}
        </div>
      </div>

      {/* Date fields */}
      {type === 'stay' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="checkin" className={lbl}>{t.checkin} *</label>
            <input id="checkin" type="date" min={today} value={checkin} onChange={e => setCheckin(e.target.value)} className={inp} required />
          </div>
          <div>
            <label htmlFor="checkout" className={lbl}>{t.checkout} *</label>
            <input id="checkout" type="date" min={checkin || today} value={checkout} onChange={e => setCheckout(e.target.value)} className={inp} required />
          </div>
        </div>
      ) : (
        <div>
          <label htmlFor="trip-date" className={lbl}>{t.date} *</label>
          <input id="trip-date" type="date" min={today} value={date} onChange={e => setDate(e.target.value)} className={inp} required />
        </div>
      )}

      {/* Guests */}
      <div>
        <label htmlFor="guests" className={lbl}>{t.guests} *</label>
        <select id="guests" value={guests} onChange={e => setGuests(e.target.value)} className={inp}>
          {Array.from({ length: maxGuests }, (_, i) => i + 1).map(n => (
            <option key={n} value={String(n)}>{n}</option>
          ))}
        </select>
      </div>

      {/* Contact */}
      <div>
        <label htmlFor="inq-name" className={lbl}>{t.name} *</label>
        <input id="inq-name" type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} className={inp} required />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="inq-email" className={lbl}>{t.email} *</label>
          <input id="inq-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} required placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="inq-phone" className={lbl}>{t.phone} *</label>
          <input id="inq-phone" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inp} required placeholder="+57 300 000 0000" />
        </div>
      </div>
      <div>
        <label htmlFor="inq-notes" className={lbl}>{t.notes}</label>
        <textarea id="inq-notes" rows={3} value={notes} onChange={e => setNotes(e.target.value)} className={inp + ' resize-none'} />
      </div>

      {status === 'validation-error' && <p className="text-red-600 text-sm">{t.required}</p>}
      {status === 'error' && <p className="text-red-600 text-sm">{t.error}</p>}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full bg-whatsapp text-white font-medium py-4 rounded-xl hover:opacity-90 disabled:opacity-60 transition-all text-sm sm:text-base"
      >
        {status === 'submitting' ? t.submitting : t.submit}
      </button>

      <p className="text-center text-sm text-ink/50">
        {t.or}{' '}
        <a
          href={`https://wa.me/573163946401?text=${waText}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-whatsapp font-medium hover:underline"
        >
          {t.whatsapp}
        </a>
      </p>
    </form>
  );
}
