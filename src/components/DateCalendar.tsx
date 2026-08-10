import { useState } from 'react';
import { isDateBlocked, isRangeBlocked, violatesWeekendMinStay, type BlockedRange } from '../lib/availability';

interface SingleProps {
  lang: 'en' | 'es';
  blocked: BlockedRange[];
  mode: 'single';
  value: string;
  onChange: (date: string) => void;
}

interface RangeProps {
  lang: 'en' | 'es';
  blocked: BlockedRange[];
  mode: 'range';
  checkin: string;
  checkout: string;
  onChangeCheckin: (date: string) => void;
  onChangeCheckout: (date: string) => void;
}

type Props = SingleProps | RangeProps;

const MONTHS = {
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
};

const WEEKDAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  es: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
};

const MAX_MONTHS_AHEAD = 6;

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toISO(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function todayISO(): string {
  const d = new Date();
  return toISO(d.getFullYear(), d.getMonth(), d.getDate());
}

// Sun-Sat week grid, padded with nulls to fill leading/trailing blanks.
function buildWeeks(year: number, month: number): (string | null)[][] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (string | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let day = 1; day <= daysInMonth; day++) cells.push(toISO(year, month, day));
  while (cells.length % 7 !== 0) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  return weeks;
}

export default function DateCalendar(props: Props) {
  const { lang, blocked, mode } = props;
  const today = todayISO();
  const now = new Date();
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  const monthOffset = (viewYear - now.getFullYear()) * 12 + (viewMonth - now.getMonth());
  const canGoPrev = monthOffset > 0;
  const canGoNext = monthOffset < MAX_MONTHS_AHEAD;

  function goPrev() {
    if (!canGoPrev) return;
    const d = new Date(viewYear, viewMonth - 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  function goNext() {
    if (!canGoNext) return;
    const d = new Date(viewYear, viewMonth + 1, 1);
    setViewYear(d.getFullYear());
    setViewMonth(d.getMonth());
  }

  const weeks = buildWeeks(viewYear, viewMonth);

  const rangeInvalid =
    mode === 'range' &&
    Boolean(props.checkin && props.checkout) &&
    isRangeBlocked(new Date(props.checkin), new Date(props.checkout), blocked);

  function handleClick(dateStr: string) {
    if (mode === 'single') {
      props.onChange(dateStr);
      return;
    }
    const { checkin, checkout, onChangeCheckin, onChangeCheckout } = props;
    // No check-in yet, or a full range already picked — start a fresh selection.
    if (!checkin || (checkin && checkout)) {
      onChangeCheckin(dateStr);
      onChangeCheckout('');
      return;
    }
    // Tapped on/before the existing check-in — treat as a new check-in.
    if (dateStr <= checkin) {
      onChangeCheckin(dateStr);
      onChangeCheckout('');
      return;
    }
    onChangeCheckout(dateStr);
  }

  return (
    <div className="select-none">
      <div className="flex items-center justify-between mb-1">
        <button
          type="button"
          onClick={goPrev}
          disabled={!canGoPrev}
          aria-label="Previous month"
          className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg transition ${
            canGoPrev ? 'text-ink hover:bg-sand/40 cursor-pointer' : 'text-ink/20 cursor-not-allowed'
          }`}
        >
          ‹
        </button>
        <p className="text-sm font-semibold text-brown">
          {MONTHS[lang][viewMonth]} {viewYear}
        </p>
        <button
          type="button"
          onClick={goNext}
          disabled={!canGoNext}
          aria-label="Next month"
          className={`w-9 h-9 flex items-center justify-center rounded-lg text-lg transition ${
            canGoNext ? 'text-ink hover:bg-sand/40 cursor-pointer' : 'text-ink/20 cursor-not-allowed'
          }`}
        >
          ›
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-0.5">
        {WEEKDAYS[lang].map(w => (
          <div key={w} className="text-center text-xs font-semibold text-terracotta uppercase">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weeks.flatMap((week, wi) =>
          week.map((dateStr, di) => {
            if (!dateStr) return <div key={`${wi}-${di}`} />;

            const isPast = dateStr < today;
            const isBlockedDate = !isPast && isDateBlocked(new Date(dateStr), blocked);
            const isMinStayBlocked =
              mode === 'range' &&
              !isPast &&
              !isBlockedDate &&
              Boolean(props.checkin) &&
              !props.checkout &&
              dateStr > props.checkin &&
              violatesWeekendMinStay(props.checkin, dateStr);
            const isDisabled = isPast || isBlockedDate || isMinStayBlocked;
            const isToday = dateStr === today;

            const isEndpoint = mode === 'range' && (dateStr === props.checkin || dateStr === props.checkout);
            const isInRange =
              mode === 'range' &&
              Boolean(props.checkin && props.checkout && dateStr > props.checkin && dateStr < props.checkout);
            const isSelected = mode === 'single' ? dateStr === props.value : isEndpoint;

            let classes = 'relative flex items-center justify-center min-h-9 h-9 p-1 rounded-lg text-[13px] font-medium transition ';

            if (isBlockedDate || isPast) {
              classes += 'bg-rose text-ink/60 line-through cursor-not-allowed';
            } else if (isMinStayBlocked) {
              classes += 'bg-sand/40 text-ink/30 cursor-not-allowed';
            } else if (rangeInvalid && (isEndpoint || isInRange)) {
              classes += 'bg-red-100 text-red-600 border border-red-400 cursor-pointer';
            } else if (isSelected) {
              classes += 'bg-brown text-white cursor-pointer';
            } else if (isInRange) {
              classes += 'bg-sand text-ink cursor-pointer';
            } else {
              classes += 'bg-white text-ink hover:bg-sand cursor-pointer';
            }

            if (isToday && !isSelected) {
              classes += ' border-2 border-sand';
            }

            return (
              <button
                key={dateStr}
                type="button"
                disabled={isDisabled}
                aria-disabled={isDisabled}
                aria-pressed={isSelected}
                aria-label={dateStr}
                onClick={() => handleClick(dateStr)}
                className={classes}
              >
                {Number(dateStr.slice(-2))}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
