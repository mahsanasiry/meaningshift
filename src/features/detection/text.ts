import type { Highlight, Span } from "./types";

function normalizeCode(code: number): string {
  if (code >= 0x06f0 && code <= 0x06f9) {
    return String.fromCharCode(0x30 + code - 0x06f0);
  }
  if (code >= 0x0660 && code <= 0x0669) {
    return String.fromCharCode(0x30 + code - 0x0660);
  }
  switch (code) {
    case 0x066a:
      return "%";
    case 0x066b:
      return ".";
    case 0x066c:
      return ",";
    case 0x0643:
      return "\u06a9";
    case 0x0649:
    case 0x064a:
      return "\u06cc";
    case 0x00a0:
    case 0x200c:
    case 0x200d:
    case 0x200e:
    case 0x200f:
      return " ";
    default:
      if ((code >= 0x202a && code <= 0x202e) || (code >= 0x2066 && code <= 0x2069)) {
        return " ";
      }
      return String.fromCharCode(code);
  }
}

// Every replacement is one UTF-16 unit, so offsets in the result are valid offsets
// in the original text.
export function normalizeForMatching(text: string): string {
  let result = "";
  for (let index = 0; index < text.length; index += 1) {
    result += normalizeCode(text.charCodeAt(index));
  }
  return result;
}

export function compactWhitespace(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function phraseToPattern(phrase: string): string {
  return compactWhitespace(phrase).split(" ").map(escapeRegExp).join("\\s+");
}

const WORD_CHARACTER = "[\\p{L}\\p{N}]";

export function boundedAlternation(phrases: readonly string[]): RegExp {
  if (phrases.length === 0) {
    return /(?!)/gu;
  }
  const alternatives = [...phrases]
    .sort((first, second) => second.length - first.length)
    .map(phraseToPattern);
  return new RegExp(
    `(?<!${WORD_CHARACTER})(?:${alternatives.join("|")})(?!${WORD_CHARACTER})`,
    "giu",
  );
}

export function spansOverlap(first: Span, second: Span): boolean {
  return first.start < second.end && second.start < first.end;
}

export function overlapsAny(span: Span, others: readonly Span[]): boolean {
  return others.some((other) => spansOverlap(span, other));
}

export function makeHighlight(text: string, span: Span): Highlight {
  return { span, excerpt: text.slice(span.start, span.end) };
}

const CLAUSE_END = /[,.;:!?\u060c\u061b\u061f\n]/u;

export function clauseFrom(text: string, start: number, maxLength = 80): string {
  const window = text.slice(start, start + maxLength);
  const stop = window.search(CLAUSE_END);
  return (stop === -1 ? window : window.slice(0, stop)).trim();
}

// The isolates keep right-to-left excerpts from reordering the English sentence around them.
export function quote(excerpt: string): string {
  return `\u201c\u2068${compactWhitespace(excerpt)}\u2069\u201d`;
}
