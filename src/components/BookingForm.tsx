import { useState } from 'react';

interface BookingFormProps {
  accessKey: string;
  lang?: 'en' | 'es';
}

type Status = 'idle' | 'submitting' | 'error' | 'validation-error';

const T = {
  en: {
    checkin: 'Check-in date',
    checkout: 'Check-out date',
    guests: 'Number of guests',
    name: 'Full name',
    email: 'Email address',
    phone: 'Phone / WhatsApp',
    notes: 'Special requests (optional)',
    submit: 'Send booking inquiry',
    submitting: 'Sending…',
    error: 'Something went wrong. Please try again or message us on WhatsApp.',
    waFallback: 'Message us directly on WhatsApp',
    required: 'Please fill in all required fields.',
    guestOptions: ['1 guest', '2 guests', '3 guests', '4 guests', '5 guests', '6 guests', '7 guests', '8 guests'],
  },
  es: {
    checkin: 'Fecha de llegada',
    checkout: 'Fecha de salida',
    guests: 'Número de huéspedes',
    name: 'Nombre completo',
    email: 'Correo electrónico',
    phone: 'Teléfono / WhatsApp',
    notes: 'Solicitudes especiales (opcional)',
    submit: 'Enviar consulta de reserva',
    submitting: 'Enviando…',
    error: 'Algo salió mal. Inténtalo de nuevo o escríbenos por WhatsApp.',
    waFallback: 'Escríbenos directamente por WhatsApp',
    required: 'Por favor completa todos los campos requeridos.',
    guestOptions: ['1 huésped', '2 huéspedes', '3 huéspedes', '4 huéspedes', '5 huéspedes', '6 huéspedes', '7 huéspedes', '8 huéspedes'],
  },
};

export default function BookingForm({ accessKey, lang = 'en' }: BookingFormProps) {
  const t = T[lang];
  const waBaseMsg = lang === 'es'
    ? 'Hola, estoy interesado en planear una estadía en Baru Beach House.'
    : 'Hi, I am interested in planning a stay at Baru Beach House.';

  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [guests, setGuests] = useState('2');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const today = new Date().toISOString().split('T')[0];

  const waMessage = (() => {
    let msg = waBaseMsg;
    if (checkin && checkout) msg += ` Dates: ${checkin} to ${checkout}.`;
    if (guests) msg += ` Guests: ${guests}.`;
    return encodeURIComponent(msg);
  })();

  const waHref = `https://wa.me/573163946401?text=${waMessage}`;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!checkin || !checkout || !name || !email || !phone) {
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
          subject: `New Booking Inquiry — ${name}`,
          from_name: 'Baru Beach House Website',
          checkin,
          checkout,
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

  const inputClass =
    'w-full rounded-xl border border-sand/40 bg-white px-4 py-3 text-sm text-ink placeholder-ink/40 focus:border-ocean focus:outline-none focus:ring-2 focus:ring-ocean/20 transition';
  const labelClass = 'block text-sm font-medium text-ink/70 mb-1.5';

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-5">
      {/* Date row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="checkin" className={labelClass}>{t.checkin} *</label>
          <input
            id="checkin"
            type="date"
            min={today}
            value={checkin}
            onChange={e => setCheckin(e.target.value)}
            required
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor="checkout" className={labelClass}>{t.checkout} *</label>
          <input
            id="checkout"
            type="date"
            min={checkin || today}
            value={checkout}
            onChange={e => setCheckout(e.target.value)}
            required
            className={inputClass}
          />
        </div>
      </div>

      {/* Guests */}
      <div>
        <label htmlFor="guests" className={labelClass}>{t.guests} *</label>
        <select
          id="guests"
          value={guests}
          onChange={e => setGuests(e.target.value)}
          className={inputClass}
        >
          {t.guestOptions.map((opt, i) => (
            <option key={i} value={String(i + 1)}>{opt}</option>
          ))}
        </select>
      </div>

      {/* Personal info */}
      <div>
        <label htmlFor="name" className={labelClass}>{t.name} *</label>
        <input
          id="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={e => setName(e.target.value)}
          required
          className={inputClass}
          placeholder="e.g. María García"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="email" className={labelClass}>{t.email} *</label>
          <input
            id="email"
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
          <label htmlFor="phone" className={labelClass}>{t.phone} *</label>
          <input
            id="phone"
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
        <label htmlFor="notes" className={labelClass}>{t.notes}</label>
        <textarea
          id="notes"
          rows={3}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          className={inputClass + ' resize-none'}
          placeholder={lang === 'es' ? 'Celebración especial, restricciones alimentarias, etc.' : 'Special celebration, dietary restrictions, etc.'}
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
