import { useState } from 'react';

type Transport = 'boat' | 'car_boat';

export interface CartDetail {
  foodOn: boolean;
  people: number;
  days: number;
  foodSubtotal: number;
  transport: Transport;
  transportSubtotal: number;
  extrasTotal: number;
}

interface Props {
  lang?: 'en' | 'es';
}

const T = {
  en: {
    foodToggle: 'Add food service — $50 USD / person / day',
    peopleLabel: 'People',
    daysLabel: 'Days',
    transportLabel: 'Transport (choose one)',
    boatLabel: 'Private boat',
    boatSub: '$250 USD each way · up to 10 people',
    carLabel: 'Car + boat',
    carSub: '$200 USD each way',
    extrasEstimate: 'Extras estimate',
    disclaimer: "Accommodation depends on your dates — we'll send your exact total together with these extras once you check availability.",
    cta: 'Check your dates & get your rate →',
  },
  es: {
    foodToggle: 'Agregar servicio de comida — $50 USD / persona / día',
    peopleLabel: 'Personas',
    daysLabel: 'Días',
    transportLabel: 'Transporte (elige uno)',
    boatLabel: 'Lancha privada',
    boatSub: '$250 USD cada trayecto · hasta 10 personas',
    carLabel: 'Carro + lancha',
    carSub: '$200 USD cada trayecto',
    extrasEstimate: 'Estimado de extras',
    disclaimer: 'El alojamiento depende de tus fechas — te enviaremos tu total exacto junto con estos extras al verificar disponibilidad.',
    cta: 'Consulta tus fechas y tu tarifa →',
  },
};

function Stepper({ value, min, max, onChange }: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="w-9 h-9 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink transition flex items-center justify-center text-lg leading-none"
      >−</button>
      <span className="text-base font-semibold w-6 text-center text-ink">{value}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="w-9 h-9 rounded-full border border-terracotta/30 text-ink/60 hover:border-brown hover:text-ink transition flex items-center justify-center text-lg leading-none"
      >+</button>
    </div>
  );
}

export default function PricingCart({ lang = 'en' }: Props) {
  const t = T[lang];
  const [foodOn, setFoodOn] = useState(true);
  const [people, setPeople] = useState(4);
  const [days, setDays] = useState(2);
  const [transport, setTransport] = useState<Transport>('boat');

  const foodSubtotal = foodOn ? people * days * 50 : 0;
  const transportSubtotal = transport === 'boat' ? 250 * 2 : 200 * 2;
  const extrasTotal = foodSubtotal + transportSubtotal;

  function handleCTA() {
    const cart: CartDetail = { foodOn, people, days, foodSubtotal, transport, transportSubtotal, extrasTotal };
    window.dispatchEvent(new CustomEvent('open-wa-popup', { detail: { type: 'stay', cart } }));
  }

  return (
    <div className="bg-white rounded-2xl border border-terracotta/15 shadow-sm p-6 sm:p-8">
      {/* Food */}
      <div className="pb-6 border-b border-terracotta/10">
        <label className="flex items-center gap-3 cursor-pointer select-none mb-4">
          <input
            type="checkbox"
            checked={foodOn}
            onChange={e => setFoodOn(e.target.checked)}
            className="w-5 h-5 rounded border-terracotta/40 text-brown focus:ring-brown/30"
          />
          <span className="font-semibold text-brown text-sm sm:text-base">{t.foodToggle}</span>
        </label>
        {foodOn && (
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pl-8">
            <div>
              <p className="text-xs text-ink/50 mb-1.5">{t.peopleLabel}</p>
              <Stepper value={people} min={1} max={20} onChange={setPeople} />
            </div>
            <div>
              <p className="text-xs text-ink/50 mb-1.5">{t.daysLabel}</p>
              <Stepper value={days} min={1} max={14} onChange={setDays} />
            </div>
            <div className="ml-auto text-right">
              <p className="text-xs text-ink/50 mb-1">${foodSubtotal} USD</p>
            </div>
          </div>
        )}
      </div>

      {/* Transport */}
      <div className="py-6 border-b border-terracotta/10">
        <p className="font-semibold text-brown text-sm sm:text-base mb-3">{t.transportLabel}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {([
            { value: 'boat' as Transport, label: t.boatLabel, sub: t.boatSub },
            { value: 'car_boat' as Transport, label: t.carLabel, sub: t.carSub },
          ]).map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setTransport(opt.value)}
              className={`text-left px-4 py-3 rounded-xl border transition-all ${
                transport === opt.value
                  ? 'border-brown bg-brown/5'
                  : 'border-terracotta/25 hover:border-brown/40'
              }`}
            >
              <p className="font-medium text-sm text-ink">{opt.label}</p>
              <p className="text-xs text-ink/55">{opt.sub}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="pt-6 flex items-baseline justify-between">
        <span className="text-sm font-medium text-ink/60">{t.extrasEstimate}</span>
        <span className="text-2xl font-bold text-brown">${extrasTotal} USD</span>
      </div>
      <p className="text-xs text-ink/50 italic mt-2 mb-6">{t.disclaimer}</p>

      <button
        type="button"
        onClick={handleCTA}
        className="w-full bg-sand text-brown font-semibold py-4 rounded-full text-sm sm:text-base hover:opacity-90 transition-opacity"
      >
        {t.cta}
      </button>
    </div>
  );
}
