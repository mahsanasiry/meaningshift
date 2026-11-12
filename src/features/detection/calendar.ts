const DAY_MS = 86_400_000;

// The Persian calendar rules come from the platform's Intl data so they are not copied here.
const persianFormatter = new Intl.DateTimeFormat("en-u-ca-persian-nu-latn", {
  year: "numeric",
  month: "numeric",
  day: "numeric",
  timeZone: "UTC",
});

export type IsoDate = string;

export type DateInterval = {
  readonly start: IsoDate;
  readonly end: IsoDate;
};

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

function isoFromMilliseconds(milliseconds: number): IsoDate {
  return new Date(milliseconds).toISOString().slice(0, 10);
}

export function addDays(date: IsoDate, days: number): IsoDate {
  return isoFromMilliseconds(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS);
}

export function lastDayOfGregorianMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function gregorianToIso(year: number, month: number, day: number): IsoDate | null {
  if (!Number.isInteger(year) || year < 1000 || year > 2999) {
    return null;
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  if (!Number.isInteger(day) || day < 1 || day > lastDayOfGregorianMonth(year, month)) {
    return null;
  }
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

type PersianDate = { year: number; month: number; day: number };

function persianPartsOf(milliseconds: number): PersianDate | null {
  let year = Number.NaN;
  let month = Number.NaN;
  let day = Number.NaN;
  for (const part of persianFormatter.formatToParts(new Date(milliseconds))) {
    if (part.type === "year") {
      year = Number(part.value);
    } else if (part.type === "month") {
      month = Number(part.value);
    } else if (part.type === "day") {
      day = Number(part.value);
    }
  }
  return Number.isNaN(year) || Number.isNaN(month) || Number.isNaN(day)
    ? null
    : { year, month, day };
}

const jalaliCache = new Map<string, IsoDate | null>();

export function jalaliToIso(year: number, month: number, day: number): IsoDate | null {
  if (!Number.isInteger(year) || year < 1 || year > 3000) {
    return null;
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    return null;
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    return null;
  }

  const key = `${year}-${month}-${day}`;
  if (jalaliCache.has(key)) {
    return jalaliCache.get(key) ?? null;
  }

  // Nowruz falls between 19 and 22 March, so a window starting on 17 March always contains it.
  const dayOfYear = month <= 6 ? (month - 1) * 31 : 186 + (month - 7) * 30;
  const base = Date.UTC(year + 621, 2, 17) + (dayOfYear + day - 1) * DAY_MS;

  let found: IsoDate | null = null;
  for (let offset = 0; offset <= 8 && found === null; offset += 1) {
    const candidate = base + offset * DAY_MS;
    const parts = persianPartsOf(candidate);
    if (parts && parts.year === year && parts.month === month && parts.day === day) {
      found = isoFromMilliseconds(candidate);
    }
  }
  jalaliCache.set(key, found);
  return found;
}

function intervalBetween(start: IsoDate | null, nextStart: IsoDate | null): DateInterval | null {
  if (start === null || nextStart === null) {
    return null;
  }
  return { start, end: addDays(nextStart, -1) };
}

export function gregorianYearInterval(year: number): DateInterval | null {
  const start = gregorianToIso(year, 1, 1);
  const end = gregorianToIso(year, 12, 31);
  return start !== null && end !== null ? { start, end } : null;
}

export function gregorianMonthInterval(year: number, month: number): DateInterval | null {
  const start = gregorianToIso(year, month, 1);
  if (start === null) {
    return null;
  }
  return { start, end: gregorianToIso(year, month, lastDayOfGregorianMonth(year, month)) ?? start };
}

export function jalaliYearInterval(year: number): DateInterval | null {
  return intervalBetween(jalaliToIso(year, 1, 1), jalaliToIso(year + 1, 1, 1));
}

export function jalaliMonthInterval(year: number, month: number): DateInterval | null {
  const next = month === 12 ? jalaliToIso(year + 1, 1, 1) : jalaliToIso(year, month + 1, 1);
  return intervalBetween(jalaliToIso(year, month, 1), next);
}

export function intervalLengthInDays(interval: DateInterval): number {
  return (
    Math.round(
      (Date.parse(`${interval.end}T00:00:00Z`) - Date.parse(`${interval.start}T00:00:00Z`)) /
        DAY_MS,
    ) + 1
  );
}

export function overlapInDays(first: DateInterval, second: DateInterval): number {
  const start = first.start > second.start ? first.start : second.start;
  const end = first.end < second.end ? first.end : second.end;
  return start > end ? 0 : intervalLengthInDays({ start, end });
}
