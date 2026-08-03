import { useEffect, useRef, useState } from 'react';
import WhatsAppIcon from './icons/WhatsAppIcon';

export interface DrinkItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  price6pack?: number;
}

export interface DrinkCategory {
  id: string;
  name: string;
  items: DrinkItem[];
}

interface DrinksOrderProps {
  lang: 'en' | 'es';
  bookingId: string | null;
  manuelNumber?: string;
  categories: DrinkCategory[];
}

const T = {
  en: {
    namePlaceholder: 'Your name',
    notesPlaceholder: 'Anything else? (optional)',
    yourOrder: 'Your order',
    submit: 'Order for Manuel →',
    sending: 'Sending…',
    success: '✓ Order sent to Manuel 🍺',
    waFailed: "WhatsApp didn't open? Copy this message and send it to Manuel:",
    copy: 'Copy',
    copied: 'Copied ✓',
    savePrefix: 'save',
    sixPackApplied: '6-pack price applied',
    guest: 'Guest',
    booking: 'Booking',
    order: 'Order',
    total: 'Total',
    note: 'Note',
    header: '🍺 Drinks order',
  },
  es: {
    namePlaceholder: 'Tu nombre',
    notesPlaceholder: '¿Algo más? (opcional)',
    yourOrder: 'Tu pedido',
    submit: 'Pedir a Manuel →',
    sending: 'Enviando…',
    success: '✓ Pedido enviado a Manuel 🍺',
    waFailed: '¿WhatsApp no se abrió? Copia este mensaje y envíalo a Manuel:',
    copy: 'Copiar',
    copied: 'Copiado ✓',
    savePrefix: 'ahorrás',
    sixPackApplied: 'Precio de six-pack aplicado',
    guest: 'Huésped',
    booking: 'Reserva',
    order: 'Pedido',
    total: 'Total',
    note: 'Nota',
    header: '🍺 Pedido de bebidas',
  },
};

function formatCOP(pesos: number): string {
  return `$${Math.round(pesos).toLocaleString('es-CO')}`;
}

function subtotal(item: DrinkItem, qty: number): number {
  if (qty <= 0) return 0;
  if (item.price6pack && qty >= 6) return item.price6pack + item.price * (qty - 6);
  return item.price * qty;
}

// e.g. "Budweiser ×7 (6-pack + 1)" once the 6-pack price kicks in, so the
// order summary (and the WhatsApp message sent to Manuel) show the pricing
// breakdown, not just a flat quantity.
function orderLineLabel(item: DrinkItem, qty: number): string {
  if (item.price6pack && qty >= 6) {
    const extra = qty - 6;
    return `${item.name} ×${qty} (6-pack${extra > 0 ? ` + ${extra}` : ''})`;
  }
  return `${item.name} × ${qty}`;
}

export default function DrinksOrder({ lang, bookingId, manuelNumber = '573178029492', categories }: DrinksOrderProps) {
  const t = T[lang];
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [guestName, setGuestName] = useState('');
  const [notes, setNotes] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [fallbackMessage, setFallbackMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!bookingId) return;
    (async () => {
      try {
        const res = await fetch(`/admin/api/bookings/${encodeURIComponent(bookingId)}/guest-name`);
        if (!res.ok) return;
        const data = await res.json() as { guestName?: string | null };
        if (data.guestName) setGuestName((prev) => prev || data.guestName || '');
      } catch {
        // prefill is a nicety — the guest can always type their name
      }
    })();
  }, [bookingId]);

  function setQty(id: string, qty: number) {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(0, qty) }));
  }

  const allItems = categories.flatMap((c) => c.items);
  const selectedItems = allItems
    .map((item) => ({ item, qty: quantities[item.id] || 0 }))
    .filter((entry) => entry.qty > 0);
  const total = selectedItems.reduce((sum, { item, qty }) => sum + subtotal(item, qty), 0);

  function buildMessage(): string {
    const lines = [t.header, ''];
    lines.push(`${t.guest}: ${guestName.trim()}`);
    if (bookingId) lines.push(`${t.booking}: ${bookingId}`);
    lines.push('', `${t.order}:`);
    selectedItems.forEach(({ item, qty }) => {
      lines.push(`• ${orderLineLabel(item, qty)} — ${formatCOP(subtotal(item, qty))}`);
    });
    lines.push('', `${t.total}: ${formatCOP(total)} COP`);
    if (notes.trim()) lines.push(`${t.note}: ${notes.trim()}`);
    return lines.join('\n');
  }

  async function handleSubmit() {
    if (!guestName.trim()) {
      setShake(true);
      nameInputRef.current?.focus();
      setTimeout(() => setShake(false), 500);
      return;
    }
    setLoading(true);
    const whatsappWindow = window.open('', '_blank');
    try {
      await fetch('/api/drinks-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookingId,
          guestName: guestName.trim(),
          items: selectedItems.map(({ item, qty }) => ({ name: item.name, qty, price: item.price })),
          total,
          notes: notes.trim() || null,
        }),
        keepalive: true,
      });
    } catch {
      // offline — still open WhatsApp below, this is not a blocking failure
    }

    const message = buildMessage();
    const waUrl = `https://wa.me/${manuelNumber}?text=${encodeURIComponent(message)}`;

    if (whatsappWindow) {
      whatsappWindow.location.href = waUrl;
      setSubmitted(true);
      setQuantities({});
    } else {
      setFallbackMessage(message);
    }
    setLoading(false);
  }

  async function copyFallback() {
    if (!fallbackMessage) return;
    try {
      await navigator.clipboard.writeText(fallbackMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — the textarea is still selectable/copyable by hand
    }
  }

  const inputCls = `w-full rounded-xl border px-4 py-3 text-sm text-ink placeholder-ink/40 focus:border-brown focus:outline-none focus:ring-2 focus:ring-brown/15 transition ${
    shake ? 'border-red-500 animate-shake' : 'border-terracotta/30 bg-white'
  }`;

  return (
    <div>
      {categories.map((category) => (
        <div key={category.id} className="mb-9">
          <h2 className="font-serif text-xl font-semibold text-brown mb-3">{category.name}</h2>
          <div className="divide-y divide-sand/40">
            {category.items.map((item) => {
              const qty = quantities[item.id] || 0;
              const sixPackApplied = !!item.price6pack && qty >= 6;
              const savings = item.price6pack ? item.price * 6 - item.price6pack : 0;
              return (
                <div key={item.id} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-ink">{item.name}</p>
                    {item.description && <p className="text-xs text-muted italic mt-0.5">{item.description}</p>}
                    <p className="text-xs text-brown/70 mt-1">{formatCOP(item.price)} COP</p>
                    {item.price6pack != null && (
                      sixPackApplied ? (
                        <p
                          className="inline-block mt-1.5"
                          style={{ background: '#E6C497', color: '#57392E', fontSize: '12px', borderRadius: '4px', padding: '2px 8px' }}
                        >
                          🎉 {t.sixPackApplied} — {formatCOP(item.price6pack)}
                        </p>
                      ) : (
                        <p className="mt-1" style={{ color: '#B28471', fontSize: '12px' }}>
                          6-pack: {formatCOP(item.price6pack)} — {t.savePrefix} {formatCOP(savings)}
                        </p>
                      )
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      aria-label="−"
                      disabled={qty === 0}
                      onClick={() => setQty(item.id, qty - 1)}
                      className="w-11 h-11 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink disabled:opacity-30 disabled:cursor-not-allowed transition flex items-center justify-center text-xl leading-none"
                    >
                      −
                    </button>
                    <span className="w-8 text-center text-base font-semibold text-ink">{qty}</span>
                    <button
                      type="button"
                      aria-label="+"
                      onClick={() => setQty(item.id, qty + 1)}
                      className="w-11 h-11 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink transition flex items-center justify-center text-xl leading-none"
                    >
                      +
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {submitted && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-green-600 text-white font-semibold text-center py-4 px-5 shadow-lg animate-fade-in">
          {t.success}
        </div>
      )}

      {!submitted && fallbackMessage && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-sand p-4 shadow-[0_-2px_10px_rgba(0,0,0,0.1)]">
          <p className="text-sm text-ink/80 mb-2">{t.waFailed}</p>
          <textarea
            readOnly
            value={fallbackMessage}
            rows={4}
            className="w-full rounded-xl border border-terracotta/30 bg-white px-3 py-2 text-xs text-ink mb-2"
            onFocus={(e) => e.currentTarget.select()}
          />
          <button
            type="button"
            onClick={copyFallback}
            className="w-full rounded-xl bg-brown text-white font-semibold py-3 text-sm"
          >
            {copied ? t.copied : t.copy}
          </button>
        </div>
      )}

      {!submitted && !fallbackMessage && total > 0 && (
        <div
          className="fixed bottom-0 left-0 right-0 z-40 text-white shadow-[0_-2px_10px_rgba(0,0,0,0.15)]"
          style={{ background: '#57392E' }}
        >
          <div className="max-w-md mx-auto px-5 py-4">
            <p className="font-semibold mb-1">{t.yourOrder}: {formatCOP(total)} COP</p>
            <ul className="text-xs text-white/85 mb-3 space-y-0.5">
              {selectedItems.map(({ item, qty }) => (
                <li key={item.id}>{orderLineLabel(item, qty)} — {formatCOP(subtotal(item, qty))}</li>
              ))}
            </ul>
            <input
              ref={nameInputRef}
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder={t.namePlaceholder}
              className={`${inputCls} mb-2`}
            />
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t.notesPlaceholder}
              className={`${inputCls} mb-2 border-terracotta/30 bg-white`}
            />
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="w-full font-semibold py-3.5 rounded-xl text-sm text-white hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-70"
              style={{ background: '#25D366' }}
            >
              <WhatsAppIcon className="w-5 h-5 flex-shrink-0" />
              {loading ? t.sending : t.submit}
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes drinksShake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-6px); }
          40%, 80% { transform: translateX(6px); }
        }
        .animate-shake { animation: drinksShake 0.4s ease-in-out; }
      `}</style>
    </div>
  );
}
