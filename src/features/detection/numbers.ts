import { escapeRegExp, overlapsAny, spansOverlap } from "./text";
import type { LanguageRules, NumberWord } from "./languages/types";
import type { Span } from "./types";

export type NumberMention = {
  readonly value: number;
  readonly percent: boolean;
  readonly span: Span;
  readonly key: string;
};

type WordToken = {
  readonly text: string;
  readonly start: number;
  readonly end: number;
};

const DIGIT_NUMBER = /(?<![\p{L}\p{N}])\d+(?:[.,]\d+)*(?![\p{L}\p{N}])/gu;
const JOINING_GAP = /^[\s-]+$/;

// Digits after normalization use "." for decimals and "," for thousands.
// Ambiguous shapes such as 1.234.567 are skipped rather than guessed.
export function parseDigitNumber(raw: string): number | null {
  if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(raw)) {
    return Number(raw.replaceAll(",", ""));
  }
  if (/^\d+(?:\.\d+)?$/.test(raw)) {
    return Number(raw);
  }
  if (/^\d+,\d+$/.test(raw)) {
    return Number(raw.replace(",", "."));
  }
  return null;
}

function makeMention(value: number, percent: boolean, span: Span): NumberMention {
  const rounded = Number(value.toPrecision(12));
  return { value: rounded, percent, span, key: `${rounded}${percent ? "%" : ""}` };
}

function percentSuffixLength(normalized: string, end: number, rules: LanguageRules): number {
  const words = rules.percentWords.map((word) => word.split(" ").map(escapeRegExp).join("\\s+"));
  const pattern = new RegExp(`^\\s*(?:%|(?:${words.join("|")})(?![\\p{L}\\p{N}]))`, "iu");
  const match = pattern.exec(normalized.slice(end));
  return match ? match[0].length : 0;
}

// "2.5 million" and "۳ میلیون" are one quantity, not a number followed by a stray scale word.
function scaleAfter(
  normalized: string,
  end: number,
  rules: LanguageRules,
): { value: number; end: number } | null {
  const match = /^\s+(\p{L}+)/u.exec(normalized.slice(end));
  const word = match ? rules.numberWords[(match[1] ?? "").toLowerCase()] : undefined;
  return match && word?.kind === "scale" ? { value: word.value, end: end + match[0].length } : null;
}

function wordTokens(normalized: string): WordToken[] {
  return [...normalized.matchAll(/\p{L}+/gu)].map((match) => ({
    text: match[0],
    start: match.index,
    end: match.index + match[0].length,
  }));
}

function isTens(word: NumberWord): boolean {
  return word.kind === "add" && word.value >= 20 && word.value < 100 && word.value % 10 === 0;
}

function isOnes(word: NumberWord): boolean {
  return word.kind === "add" && word.value >= 1 && word.value <= 9;
}

function canFollow(
  previous: NumberWord,
  next: NumberWord,
  viaConnector: boolean,
  rules: LanguageRules,
): boolean {
  if (next.kind === "scale") {
    return true;
  }
  if (next.kind === "times-hundred") {
    return previous.kind === "add" && previous.value >= 1 && previous.value <= 99 && !viaConnector;
  }
  if (previous.kind !== "add") {
    return true;
  }
  if (isTens(previous) && isOnes(next)) {
    return rules.connectorJoinsSmallNumbers ? viaConnector : !viaConnector;
  }
  if (previous.value >= 100 && previous.value < 1000 && next.value < 100) {
    return rules.connectorJoinsSmallNumbers && viaConnector;
  }
  return false;
}

type Run = {
  value: number;
  start: number;
  end: number;
  words: number;
};

function lookupWord(token: WordToken | undefined, rules: LanguageRules): NumberWord | undefined {
  return token ? rules.numberWords[token.text.toLowerCase()] : undefined;
}

function scanWrittenNumbers(normalized: string, rules: LanguageRules): Run[] {
  const tokens = wordTokens(normalized);
  const connectors = new Set(rules.numberConnectors);
  const stopFollowers = new Set(rules.numberStopFollowers);
  const runs: Run[] = [];

  let index = 0;
  while (index < tokens.length) {
    const first = tokens[index];
    const firstWord = lookupWord(first, rules);
    if (first === undefined || firstWord === undefined) {
      index += 1;
      continue;
    }

    let total = 0;
    let current = 0;
    let last = firstWord;
    let end = first.end;
    let words = 1;

    const apply = (word: NumberWord) => {
      if (word.kind === "add") {
        current += word.value;
      } else if (word.kind === "times-hundred") {
        current = (current === 0 ? 1 : current) * word.value;
      } else {
        total += (current === 0 ? 1 : current) * word.value;
        current = 0;
      }
    };
    apply(firstWord);

    let cursor = index + 1;
    while (cursor < tokens.length) {
      const previousToken = tokens[cursor - 1];
      const nextToken = tokens[cursor];
      if (previousToken === undefined || nextToken === undefined) {
        break;
      }
      if (!JOINING_GAP.test(normalized.slice(previousToken.end, nextToken.start))) {
        break;
      }

      let wordToken = nextToken;
      let consumed = 1;
      let viaConnector = false;
      if (connectors.has(nextToken.text.toLowerCase())) {
        const afterConnector = tokens[cursor + 1];
        if (afterConnector === undefined) {
          break;
        }
        if (!JOINING_GAP.test(normalized.slice(nextToken.end, afterConnector.start))) {
          break;
        }
        if (!rules.connectorJoinsSmallNumbers && last.kind === "add") {
          break;
        }
        wordToken = afterConnector;
        consumed = 2;
        viaConnector = true;
      }

      const candidate = lookupWord(wordToken, rules);
      if (candidate === undefined || !canFollow(last, candidate, viaConnector, rules)) {
        break;
      }
      apply(candidate);
      last = candidate;
      end = wordToken.end;
      words += consumed;
      cursor += consumed;
    }

    const following = tokens[cursor];
    const followedByStopWord =
      following !== undefined &&
      stopFollowers.has(following.text) &&
      JOINING_GAP.test(normalized.slice(end, following.start));
    if (!followedByStopWord) {
      runs.push({ value: total + current, start: first.start, end, words });
    }
    index = cursor;
  }
  return runs;
}

export function extractNumbers(
  normalized: string,
  rules: LanguageRules,
  excluded: readonly Span[],
): NumberMention[] {
  const mentions: NumberMention[] = [];

  for (const match of normalized.matchAll(DIGIT_NUMBER)) {
    const parsed = parseDigitNumber(match[0]);
    let end = match.index + match[0].length;
    let value = parsed;
    const scale = scaleAfter(normalized, end, rules);
    if (value !== null && scale) {
      value *= scale.value;
      end = scale.end;
    }
    const suffix = percentSuffixLength(normalized, end, rules);
    const span = { start: match.index, end: end + suffix };
    if (value !== null && !overlapsAny(span, excluded)) {
      mentions.push(makeMention(value, suffix > 0, span));
    }
  }

  for (const run of scanWrittenNumbers(normalized, rules)) {
    const suffix = percentSuffixLength(normalized, run.end, rules);
    // A lone "one" is far more often a pronoun or article than a quantity.
    if (run.words === 1 && run.value === 1 && suffix === 0) {
      continue;
    }
    const span = { start: run.start, end: run.end + suffix };
    if (
      !overlapsAny(span, excluded) &&
      !mentions.some((mention) => spansOverlap(mention.span, span))
    ) {
      mentions.push(makeMention(run.value, suffix > 0, span));
    }
  }

  return mentions.sort((first, second) => first.span.start - second.span.start);
}
