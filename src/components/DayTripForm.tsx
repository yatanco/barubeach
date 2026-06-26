import { useState } from 'react';

interface Props {
  accessKey: string;
  lang?: 'en' | 'es';
}

type Status = 'idle' | 'submitting' | 'error' | 'validation-error';

const T = {
  en: {
    date: 'Trip date',
    guests: 'Number of guests',
    name: 'Full name',
    email: 'Email address',
    phone: 'Phone / WhatsApp (optional)',
    notes: 'Occasion or special requests (optional)',
    submit: 'Send day trip inquiry',
    submitting: 'Sending…',
    error: 'Something went wrong. Please try again.',
    required: 'Please fill in all required fields.',
    or: 'Or chat directly on',
    whatsapp: 'WhatsApp',
  },
  es: {
    date: 'Fecha del pasadía',
    guests: 'Número de personas',
    name: 'Nombre completo',
    email: 'Correo electrónico',
    phone: 'Teléfono / WhatsApp (opcional)',
    notes: 'Ocasión o solicitudes especiales (opcional)',
    submit: 'Enviar consulta de pasadía',
    submitting: 'Enviando…',
    error: 'Algo salió mal. Inténtalo de nuevo.',
    required: 'Por favor completa todos los campos requeridos.',
    or: 'O escríbenos directamente por',
    whatsapp: 'WhatsApp',
  },
};

export default function DayTripForm({ accessKey, lang = 'en' }: Props) {
  const t = T[lang];
  const [date, setDate] = useState('');
  const [guests, setGuests] = useState('4');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const today = new Date().toISOString().split('T')[0];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!date || !name || !email) {
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
          subject: `New Day Trip Inquiry — ${name}`,
          from_name: 'Casa Gaviota Website',
          experience: 'Day Trip',
          date,
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

  const inp = 'w-full rounded-xl border border-terracotta/30 bg-white px-4 py-3 text-sm text-ink placeholder-ink/40 focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/15 transition';
  const lbl = 'block text-sm font-medium text-ink/70 mb-1.5';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dt-date" className={lbl}>{t.date} *</label>
          <input id="dt-date" type="date" min={today} value={date} onChange={e => setDate(e.target.value)} className={inp} required />
        </div>
        <div>
          <label htmlFor="dt-guests" className={lbl}>{t.guests} *</label>
          <select id="dt-guests" value={guests} onChange={e => setGuests(e.target.value)} className={inp}>
            {Array.from({ length: 20 }, (_, i) => i + 1).map(n => (
              <option key={n} value={String(n)}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="dt-name" className={lbl}>{t.name} *</label>
        <input id="dt-name" type="text" autoComplete="name" value={name} onChange={e => setName(e.target.value)} className={inp} required />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="dt-email" className={lbl}>{t.email} *</label>
          <input id="dt-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} className={inp} required placeholder="you@example.com" />
        </div>
        <div>
          <label htmlFor="dt-phone" className={lbl}>{t.phone}</label>
          <input id="dt-phone" type="tel" autoComplete="tel" value={phone} onChange={e => setPhone(e.target.value)} className={inp} placeholder="+57 300 000 0000" />
        </div>
      </div>

      <div>
        <label htmlFor="dt-notes" className={lbl}>{t.notes}</label>
        <textarea
          id="dt-notes"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className={inp + ' resize-none'}
          placeholder={lang === 'es' ? 'Cumpleaños, aniversario, salida en familia…' : 'Birthday, anniversary, family outing…'}
        />
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
          href="https://wa.me/573163946401?text=gaviotadaytrip"
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
