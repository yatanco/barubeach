import { useState, useEffect, useRef } from 'react';

type ExperienceType = 'daytrip' | 'stay';

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

export default function WhatsAppPopup() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<ExperienceType>('daytrip');
  const [date, setDate] = useState('');
  const [checkin, setCheckin] = useState('');
  const [checkout, setCheckout] = useState('');
  const [adults, setAdults] = useState(2);
  const [phone, setPhone] = useState('');
  const [notes, setNotes] = useState('');
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<{ type?: ExperienceType }>).detail;
      if (detail?.type) setType(detail.type);
      setOpen(true);
    };
    window.addEventListener('open-wa-popup', handler);
    return () => window.removeEventListener('open-wa-popup', handler);
  }, []);

  const today = new Date().toISOString().split('T')[0];

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const typeLabel = type === 'daytrip' ? 'Pasadía (Day Trip)' : 'Estadía (Overnight Stay)';
    let msg = `Hola Casa Gaviota! 👋\n\nTipo: ${typeLabel}\n`;
    if (type === 'daytrip') {
      msg += `Fecha: ${date || 'Por confirmar'}`;
    } else {
      msg += `Check-in: ${checkin || 'Por confirmar'}\nCheck-out: ${checkout || 'Por confirmar'}`;
    }
    msg += `\nAdultos: ${adults}`;
    if (phone.trim()) msg += `\nMi WhatsApp: ${phone.trim()}`;
    if (notes.trim()) msg += `\nNota: ${notes.trim()}`;
    msg += '\n\nEnviado desde casagaviota.com';
    window.open(`https://wa.me/573163946401?text=${encodeURIComponent(msg)}`, '_blank');
    setOpen(false);
    setDate('');
    setCheckin('');
    setCheckout('');
    setAdults(2);
    setPhone('');
    setNotes('');
  }

  function handleOverlayClick(e: React.MouseEvent) {
    if (e.target === overlayRef.current) setOpen(false);
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
          className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-end sm:items-end sm:justify-end sm:p-6"
        >
          <div className="w-full sm:w-96 bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6 relative animate-slide-up">
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center text-ink/40 hover:text-ink transition-colors text-xl"
              aria-label="Close"
            >
              ×
            </button>

            <h3 className="font-serif text-xl font-semibold text-brown mb-1">Plan your escape 🌴</h3>
            <p className="text-sm text-ink/55 mb-5">A few details and we'll reply on WhatsApp within a few hours.</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-ink/50 uppercase tracking-wide mb-2">What are you planning?</p>
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
                      {opt === 'daytrip' ? '☀️ Day Trip' : '🌙 Overnight'}
                    </button>
                  ))}
                </div>
              </div>

              {type === 'daytrip' ? (
                <div>
                  <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">When?</label>
                  <input type="date" min={today} value={date} onChange={e => setDate(e.target.value)} className={inp} />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">Check-in</label>
                    <input type="date" min={today} value={checkin} onChange={e => setCheckin(e.target.value)} className={inp} />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">Check-out</label>
                    <input type="date" min={checkin || today} value={checkout} onChange={e => setCheckout(e.target.value)} className={inp} />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">Adults</label>
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
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">Your WhatsApp number</label>
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+57 300 000 0000"
                  className={inp}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-ink/50 uppercase tracking-wide mb-1.5">
                  Anything else? <span className="normal-case font-normal text-ink/35">(optional)</span>
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Birthday, dietary needs, questions…"
                  className={inp}
                />
              </div>

              <button
                type="submit"
                className="w-full bg-whatsapp text-white font-semibold py-3.5 rounded-xl hover:opacity-90 transition text-sm flex items-center justify-center gap-2 mt-2"
              >
                {WA_ICON_SM}
                Send on WhatsApp →
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
