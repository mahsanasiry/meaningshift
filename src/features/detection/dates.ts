import {
  gregorianMonthInterval,
  gregorianToIso,
  gregorianYearInterval,
  jalaliMonthInterval,
  jalaliToIso,
  intervalLengthInDays,
  jalaliYearInterval,
  overlapInDays,
  type DateInterval,
} from "./calendar";
import { findMarkers } from "./markers";
import { boundedAlternation, escapeRegExp, phraseToPattern, spansOverlap } from "./text";
import type { LanguageRules, MonthRule } from "./languages/types";
import type { Span } from "./types";

export type DateGroup = "interval" | "month-day" | "month" | "ambiguous" | "time" | "relative";

export type DateMention = {
  readonly span: Span;
  readonly key: string;
  readonly group: DateGroup;
  readonly jalaliYear: number | null;
  readonly gregorianYear: number | null;
  // Set for mentions that stand for a range of days.
  readonly interval?: DateInterval;
  readonly calendar?: Calendar;
};

type Calendar = MonthRule["calendar"];

function classifyYear(year: number): Calendar | null {
  if (year >= 1300 && year <= 1499) {
    return "jalali";
  }
  if (year >= 1000 && year <= 2999) {
    return "gregorian";
  }
  return null;
}

function integerOf(value: string | undefined): number {
  return Number.parseInt(value ?? "", 10);
}

function intervalKey(interval: DateInterval): string {
  return `i:${interval.start}..${interval.end}`;
}

function fullDateInterval(calendar: Calendar, year: number, month: number, day: number) {
  const iso =
    calendar === "jalali" ? jalaliToIso(year, month, day) : gregorianToIso(year, month, day);
  return iso === null ? null : { start: iso, end: iso };
}

function monthInterval(calendar: Calendar, year: number, month: number): DateInterval | null {
  return calendar === "jalali"
    ? jalaliMonthInterval(year, month)
    : gregorianMonthInterval(year, month);
}

function yearInterval(calendar: Calendar, year: number): DateInterval | null {
  return calendar === "jalali" ? jalaliYearInterval(year) : gregorianYearInterval(year);
}

// Leap days are allowed; the month length is only a sanity check on the day number.
function dayIsPossible(info: MonthRule, day: number): boolean {
  const longest =
    info.calendar === "jalali"
      ? info.month <= 6
        ? 31
        : 30
      : ([31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][info.month - 1] ?? 31);
  return Number.isInteger(day) && day >= 1 && day <= longest;
}

function lastWordBefore(normalized: string, index: number): string {
  const match = /(?:^|[^\p{L}])(\p{L}+)\s*$/u.exec(
    normalized.slice(Math.max(0, index - 24), index),
  );
  return (match?.[1] ?? "").toLowerCase();
}

function startsWithCapital(original: string, index: number): boolean {
  const character = original[index];
  return character !== undefined && character !== character.toLowerCase();
}

export function extractDates(
  original: string,
  normalized: string,
  rules: LanguageRules,
): DateMention[] {
  const mentions: DateMention[] = [];

  const add = (mention: DateMention): void => {
    if (!mentions.some((existing) => spansOverlap(existing.span, mention.span))) {
      mentions.push(mention);
    }
  };

  const addInterval = (
    span: Span,
    interval: DateInterval | null,
    calendar: Calendar,
    years: { jalali?: number; gregorian?: number } = {},
  ): void => {
    if (interval === null) {
      return;
    }
    add({
      span,
      key: intervalKey(interval),
      group: "interval",
      jalaliYear: years.jalali ?? null,
      gregorianYear: years.gregorian ?? null,
      interval,
      calendar,
    });
  };

  const monthNames = Object.keys(rules.months);
  const monthPattern = `(?:${[...monthNames]
    .sort((first, second) => second.length - first.length)
    .map(escapeRegExp)
    .join("|")})`;
  const monthOf = (name: string | undefined): MonthRule | undefined =>
    name === undefined ? undefined : rules.months[name.toLowerCase()];
  const spanOf = (match: RegExpExecArray): Span => ({
    start: match.index,
    end: match.index + match[0].length,
  });
  const monthNameIsPlausible = (match: RegExpExecArray, name: string | undefined): boolean => {
    if (name === undefined || !/^[a-z]/i.test(name)) {
      return true;
    }
    return startsWithCapital(original, match.index + match[0].indexOf(name));
  };

  for (const match of normalized.matchAll(/(?<!\d)(\d{4})-(\d{2})-(\d{2})(?!\d)/gu)) {
    const year = integerOf(match[1]);
    const calendar = classifyYear(year);
    if (calendar !== null) {
      addInterval(
        spanOf(match),
        fullDateInterval(calendar, year, integerOf(match[2]), integerOf(match[3])),
        calendar,
      );
    }
  }

  for (const match of normalized.matchAll(/(?<!\d)(\d{1,4})\/(\d{1,2})\/(\d{1,4})(?!\d)/gu)) {
    const [, first = "", second = "", third = ""] = match;
    const span = spanOf(match);
    if (first.length === 4) {
      const year = integerOf(first);
      const calendar = classifyYear(year);
      if (calendar !== null) {
        addInterval(
          span,
          fullDateInterval(calendar, year, integerOf(second), integerOf(third)),
          calendar,
        );
      }
    } else if (third.length === 4) {
      const year = integerOf(third);
      const a = integerOf(first);
      const b = integerOf(second);
      if (a > 12 && b <= 12) {
        addInterval(span, fullDateInterval("gregorian", year, b, a), "gregorian");
      } else if (b > 12 && a <= 12) {
        addInterval(span, fullDateInterval("gregorian", year, a, b), "gregorian");
      } else {
        add({
          span,
          key: `slash:${a}/${b}/${year}`,
          group: "ambiguous",
          jalaliYear: null,
          gregorianYear: null,
        });
      }
    } else {
      add({
        span,
        key: `slash:${first}/${second}/${third}`,
        group: "ambiguous",
        jalaliYear: null,
        gregorianYear: null,
      });
    }
  }

  const dayMonthYear = new RegExp(
    `(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthPattern})(?![\\p{L}\\p{N}])\\s*,?\\s*(\\d{4})(?!\\d)`,
    "giu",
  );
  for (const match of normalized.matchAll(dayMonthYear)) {
    const info = monthOf(match[2]);
    if (info && monthNameIsPlausible(match, match[2])) {
      addInterval(
        spanOf(match),
        fullDateInterval(info.calendar, integerOf(match[3]), info.month, integerOf(match[1])),
        info.calendar,
      );
    }
  }

  const monthDayYear = new RegExp(
    `(?<![\\p{L}\\p{N}])(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?\\s*,?\\s+(\\d{4})(?!\\d)`,
    "giu",
  );
  for (const match of normalized.matchAll(monthDayYear)) {
    const info = monthOf(match[1]);
    if (info && monthNameIsPlausible(match, match[1])) {
      addInterval(
        spanOf(match),
        fullDateInterval(info.calendar, integerOf(match[3]), info.month, integerOf(match[2])),
        info.calendar,
      );
    }
  }

  const monthYear = new RegExp(
    `(?<![\\p{L}\\p{N}])(${monthPattern})\\s*,?\\s*(\\d{4})(?!\\d)`,
    "giu",
  );
  for (const match of normalized.matchAll(monthYear)) {
    const info = monthOf(match[1]);
    const afterDay = /\d(?:st|nd|rd|th)?\s+(?:of\s+)?$/iu.test(normalized.slice(0, match.index));
    if (info && !afterDay && monthNameIsPlausible(match, match[1])) {
      addInterval(
        spanOf(match),
        monthInterval(info.calendar, integerOf(match[2]), info.month),
        info.calendar,
      );
    }
  }

  const dayMonth = new RegExp(
    `(?<!\\d)(\\d{1,2})(?:st|nd|rd|th)?\\s+(?:of\\s+)?(${monthPattern})(?![\\p{L}\\p{N}])`,
    "giu",
  );
  for (const match of normalized.matchAll(dayMonth)) {
    const info = monthOf(match[2]);
    const day = integerOf(match[1]);
    if (info && dayIsPossible(info, day) && monthNameIsPlausible(match, match[2])) {
      add({
        span: spanOf(match),
        key: `md:${info.calendar}:${info.month}-${day}`,
        group: "month-day",
        jalaliYear: null,
        gregorianYear: null,
      });
    }
  }

  const monthDay = new RegExp(
    `(?<![\\p{L}\\p{N}])(${monthPattern})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?![\\d:]|\\s*:)`,
    "giu",
  );
  for (const match of normalized.matchAll(monthDay)) {
    const info = monthOf(match[1]);
    const day = integerOf(match[2]);
    if (info && dayIsPossible(info, day) && monthNameIsPlausible(match, match[1])) {
      add({
        span: spanOf(match),
        key: `md:${info.calendar}:${info.month}-${day}`,
        group: "month-day",
        jalaliYear: null,
        gregorianYear: null,
      });
    }
  }

  for (const hit of findMarkers(normalized, rules.relativeDates)) {
    add({
      span: hit.span,
      key: `r:${hit.id}`,
      group: "relative",
      jalaliYear: null,
      gregorianYear: null,
    });
  }

  const units = Object.keys(rules.relativeUnits).map(escapeRegExp).join("|");
  const agoWords = rules.agoWords.map(phraseToPattern).join("|");
  if (units && agoWords) {
    const ago = new RegExp(
      `(?<!\\d)(\\d+)\\s+(${units})\\s+(?:${agoWords})(?![\\p{L}\\p{N}])`,
      "giu",
    );
    for (const match of normalized.matchAll(ago)) {
      const unit = rules.relativeUnits[(match[2] ?? "").toLowerCase()];
      if (unit !== undefined) {
        add({
          span: spanOf(match),
          key: `r:ago:${integerOf(match[1])}:${unit}`,
          group: "relative",
          jalaliYear: null,
          gregorianYear: null,
        });
      }
    }
  }

  const meridiemWords = [...rules.meridiemAm, ...rules.meridiemPm];
  const meridiem =
    meridiemWords.length > 0 ? `(?:\\s*(${meridiemWords.map(phraseToPattern).join("|")}))?` : "";
  const toTimeKey = (
    hourText: string | undefined,
    minuteText: string | undefined,
    word: string | undefined,
  ) => {
    let hour = integerOf(hourText);
    const minute = minuteText === undefined ? 0 : integerOf(minuteText);
    if (word !== undefined) {
      const lowered = word.toLowerCase().replace(/\s+/g, " ");
      const isPm = rules.meridiemPm.some((candidate) => candidate.toLowerCase() === lowered);
      if (hour < 1 || hour > 12) {
        return null;
      }
      hour = (hour % 12) + (isPm ? 12 : 0);
    }
    if (!(hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59)) {
      return null;
    }
    return `t:${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  };

  const clock = new RegExp(
    `(?<![\\d:])(\\d{1,2}):(\\d{2})(?![\\d:])${meridiem}(?![\\p{L}\\p{N}])`,
    "giu",
  );
  for (const match of normalized.matchAll(clock)) {
    const key = toTimeKey(match[1], match[2], match[3]);
    if (key !== null) {
      add({ span: spanOf(match), key, group: "time", jalaliYear: null, gregorianYear: null });
    }
  }

  if (rules.meridiemAm.length + rules.meridiemPm.length > 0) {
    const bareHour = new RegExp(
      `(?<![\\d:])(\\d{1,2})\\s*(${meridiemWords.map(phraseToPattern).join("|")})(?![\\p{L}\\p{N}])`,
      "giu",
    );
    for (const match of normalized.matchAll(bareHour)) {
      const key = toTimeKey(match[1], undefined, match[2]);
      if (key !== null) {
        add({ span: spanOf(match), key, group: "time", jalaliYear: null, gregorianYear: null });
      }
    }
  }

  if (rules.timePrefixes.length > 0) {
    const prefixed = new RegExp(
      `(?<![\\p{L}\\p{N}])(?:${rules.timePrefixes.map(phraseToPattern).join("|")})\\s+(\\d{1,2})(?::(\\d{2}))?(?![\\d:])${meridiem}(?![\\p{L}\\p{N}])`,
      "giu",
    );
    for (const match of normalized.matchAll(prefixed)) {
      const key = toTimeKey(match[1], match[2], match[3]);
      if (key !== null) {
        add({ span: spanOf(match), key, group: "time", jalaliYear: null, gregorianYear: null });
      }
    }
  }

  if (rules.yearPrefixes.length > 0) {
    const prefixedYear = new RegExp(
      `(?<![\\p{L}\\p{N}])(?:${[...rules.yearPrefixes]
        .sort((first, second) => second.length - first.length)
        .map(phraseToPattern)
        .join("|")})\\s+(\\d{4})(?!\\d)`,
      "giu",
    );
    for (const match of normalized.matchAll(prefixedYear)) {
      const year = integerOf(match[1]);
      const calendar = classifyYear(year);
      const span = { start: match.index + match[0].length - 4, end: match.index + match[0].length };
      if (calendar === "jalali") {
        addInterval(span, yearInterval("jalali", year), "jalali", { jalali: year });
      } else if (calendar === "gregorian") {
        addInterval(span, yearInterval("gregorian", year), "gregorian", { gregorian: year });
      }
    }
  }

  const contextWords = new Set(rules.monthContextWords.map((word) => word.toLowerCase()));
  for (const match of normalized.matchAll(boundedAlternation(monthNames))) {
    const name = match[0];
    const info = monthOf(name);
    const span = spanOf(match);
    if (
      info &&
      monthNameIsPlausible(match, name) &&
      contextWords.has(lastWordBefore(normalized, match.index))
    ) {
      add({
        span,
        key: `m:${info.calendar}:${info.month}`,
        group: "month",
        jalaliYear: null,
        gregorianYear: null,
      });
    }
  }

  return mentions.sort((first, second) => first.span.start - second.span.start);
}

const MONTH_LENGTH_RANGE = { min: 28, max: 31 };
const MONTH_OVERLAP_RATIO = 0.6;

function isMonthLong(interval: DateInterval): boolean {
  const length = intervalLengthInDays(interval);
  return length >= MONTH_LENGTH_RANGE.min && length <= MONTH_LENGTH_RANGE.max;
}

// Months and years in different calendars never line up exactly, so they are compared loosely:
// two months match when most of their days coincide, and a Persian year matches the two
// Gregorian years it overlaps.
export function datesAreEquivalent(first: DateMention, second: DateMention): boolean {
  if (first.key === second.key) {
    return true;
  }

  const crossCalendarYear = (jalali: DateMention, gregorian: DateMention): boolean =>
    jalali.jalaliYear !== null &&
    gregorian.gregorianYear !== null &&
    (gregorian.gregorianYear === jalali.jalaliYear + 621 ||
      gregorian.gregorianYear === jalali.jalaliYear + 622);
  if (crossCalendarYear(first, second) || crossCalendarYear(second, first)) {
    return true;
  }

  const { interval: a, calendar: calendarA } = first;
  const { interval: b, calendar: calendarB } = second;
  if (
    a &&
    b &&
    calendarA &&
    calendarB &&
    calendarA !== calendarB &&
    isMonthLong(a) &&
    isMonthLong(b)
  ) {
    const shorter = Math.min(intervalLengthInDays(a), intervalLengthInDays(b));
    return overlapInDays(a, b) / shorter >= MONTH_OVERLAP_RATIO;
  }
  return false;
}
