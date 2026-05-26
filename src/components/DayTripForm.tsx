import { useState } from 'react';

interface DayTripFormProps {
  accessKey: string;
  lang?: 'en' | 'es';
}

type Status = 'idle' | 'submitting' | 'error' | 'validation-error';

const T = {
  en: {
    date: 'Trip date',
    guests: 'Group size',
    name: 'Full name',
    email: 'Email address',
    phone: 'Phone / WhatsApp',
    occasion: 'Occasion / notes (optional)',
    submit: 'Send day trip inquiry',
    submitting: 'Sending…',
    error: 'Something went wrong. Please try again or message us on WhatsApp.',
    required: 'Please fill in all required fields.',
    waFallback: 'Message us directly on WhatsApp',
    guestOptions: Array.from({ length: 20 }, (_, i) => `${i + 1} ${i === 0 ? 'guest' : 'guests'}`),
  },
  es: {
    date: 'Fecha del pasadía',
    guests: 'Tamaño del grupo',
    name: 'Nombre completo',
    email: 'Correo electrónico',
    phone: 'Teléfono / WhatsApp',
    occasion: 'Ocasión / notas (opcional)',
    submit: 'Enviar consulta de pasadía',
    submitting: 'Enviando…',
    error: 'Algo salió mal. Inténtalo de nuevo o escríbenos por WhatsApp.',
    required: 'Por favor completa todos los campos requeridos.',
    waFallback: 'Escríbenos directamente por WhatsApp',
    guestOptions: Array.from({ length: 20 }, (_, i) => `${i + 1} ${i === 0 ? 'persona' : 'personas'}`),
  },
};

export default function DayTripForm({ accessKey, lang = 'en' }: DayTripFormProps) {
  const t = T[lang];
  const waBaseMsg = lang === 'es'
    ? 'Hola, estoy interesado en planear un pasadía privado en Baru Beach House.'
    : 'Hi, I am interested in planning a private day trip at Baru Beach House.';

  const [date, setDate] = useState('');
  const [guests, setGuests] = useState('4');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [occasion, setOccasion] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const today = new Date().toISOString().split('T')[0];

  const waMessage = (() => {
    let msg = waBaseMsg;
    if (date) msg += ` Date: ${date}.`;
    if (guests) msg += ` Group size: ${guests}.`;
    if (occasion) msg += ` Occasion: ${occasion}.`;
    return encodeURIComponent(msg);
  })();

  const waHref = `https://wa.me/573163946401?text=${waMessage}`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!date || !name || !email || !phone) {
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
          from_name: 'Baru Beach House Website',
          trip_date: date,
          guests,
          name,
          email,
          phone,
          occasion,
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

  const inputClass =
    'w-full rounded-xl border border-sand/40 bg-white px-4 py-3 text-sm text-ink placeholder-ink/40 focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20 transition';
  const labelClass = 'block text-sm font-medium text-ink/70 mb-1.5';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Date and group size */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="trip-date" className={labelClass}>{t.date} *</label>
          <input
            id="trip-date"
            type="date"
            min={today}
            value={date}
            onChange={e => setDate(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="trip-guests" className={labelClass}>{t.guests} *</label>
          <select
            id="trip-guests"
            value={guests}
            onChange={e => setGuests(e.target.value)}
            className={inputClass}
          >
            {t.guestOptions.map((opt, i) => (
              <option key={i} value={String(i + 1)}>{opt}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="trip-name" className={labelClass}>{t.name} *</label>
        <input
          id="trip-name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className={inputClass}
          placeholder="e.g. Carlos Reyes"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="trip-email" className={labelClass}>{t.email} *</label>
          <input
            id="trip-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className={inputClass}
            placeholder="you@example.com"
          />
        </div>
        <div>
          <label htmlFor="trip-phone" className={labelClass}>{t.phone} *</label>
          <input
            id="trip-phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={e => setPhone(e.target.value)}
            required
            className={inputClass}
            placeholder="+57 300 000 0000"
          />
        </div>
      </div>

      <div>
        <label htmlFor="trip-occasion" className={labelClass}>{t.occasion}</label>
        <textarea
          id="trip-occasion"
          rows={3}
          value={occasion}
          onChange={e => setOccasion(e.target.value)}
          className={inputClass + ' resize-none'}
          placeholder={lang === 'es' ? 'Cumpleaños, aniversario, salida en familia, etc.' : 'Birthday, anniversary, family outing, etc.'}
        />
      </div>

      {status === 'validation-error' && (
        <p className="text-red-600 text-sm">{t.required}</p>
      )}
      {status === 'error' && (
        <p className="text-red-600 text-sm">{t.error}</p>
      )}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="w-full bg-ocean text-white font-medium py-4 rounded-xl hover:bg-ocean-dark disabled:opacity-60 transition-colors text-sm sm:text-base"
      >
        {status === 'submitting' ? t.submitting : t.submit}
      </button>

      <p className="text-center text-sm text-ink/50">
        {lang === 'es' ? 'o ' : 'or '}
        <a
          href={waHref}
          target="_blank"
          rel="noopener noreferrer"
          className="text-whatsapp font-medium hover:underline"
        >
          {t.waFallback}
        </a>
      </p>
    </form>
  );
}
