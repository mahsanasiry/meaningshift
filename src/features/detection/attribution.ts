import { findMarkers } from "./markers";
import type { FramingRule, LanguageRules } from "./languages/types";
import type { Span } from "./types";

export type SourceScript = "latin" | "arabic" | "other";

export type AttributionMention = {
  readonly source: string;
  readonly script: SourceScript;
  readonly framing: FramingRule["framing"];
  readonly span: Span;
};

type Token = { readonly text: string; readonly start: number; readonly end: number };

const CLAUSE_BREAK = /[,.;:!?\u060c\u061b\u061f\n]/u;
const MAX_SOURCE_TOKENS_AFTER_PREFIX = 6;
const MAX_SOURCE_TOKENS_BEFORE_VERB = 4;

function tokensOf(segment: string, offset: number): Token[] {
  return [...segment.matchAll(/\S+/gu)].map((match) => ({
    text: match[0],
    start: offset + match.index,
    end: offset + match.index + match[0].length,
  }));
}

function scriptOf(source: string): SourceScript {
  if (/\p{Script=Arabic}/u.test(source)) {
    return "arabic";
  }
  return /\p{Script=Latin}/u.test(source) ? "latin" : "other";
}

function cleanSource(tokens: readonly Token[], rules: LanguageRules): string {
  const fillers = new Set(rules.sourceFillers);
  const words = tokens.map((token) =>
    token.text
      .replace(/^[\u201c\u201d"'\u2018\u2019()]+|[\u201c\u201d"'\u2018\u2019()]+$/gu, "")
      .toLowerCase(),
  );
  while (words.length > 0 && fillers.has(words[0] ?? "")) {
    words.shift();
  }
  return words.filter(Boolean).join(" ");
}

function sourceAfter(normalized: string, from: number, rules: LanguageRules) {
  const clauseEnd = normalized.slice(from).search(CLAUSE_BREAK);
  const segment = normalized.slice(from, clauseEnd === -1 ? undefined : from + clauseEnd);
  const stopWords = new Set(rules.attributionStopWords);

  const taken: Token[] = [];
  for (const token of tokensOf(segment, from)) {
    if (stopWords.has(token.text.toLowerCase()) || taken.length >= MAX_SOURCE_TOKENS_AFTER_PREFIX) {
      break;
    }
    taken.push(token);
  }
  return taken;
}

function sourceBefore(normalized: string, to: number, rules: LanguageRules) {
  const before = normalized.slice(0, to);
  let clauseStart = 0;
  for (let index = before.length - 1; index >= 0; index -= 1) {
    if (CLAUSE_BREAK.test(before.charAt(index))) {
      clauseStart = index + 1;
      break;
    }
  }

  const tokens = tokensOf(before.slice(clauseStart), clauseStart);
  const trailing = new Set(rules.sourceTrailingWords);
  const stopWords = new Set(rules.attributionStopWords);

  while (tokens.length > 0 && trailing.has((tokens[tokens.length - 1]?.text ?? "").toLowerCase())) {
    tokens.pop();
  }
  const taken: Token[] = [];
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    const token = tokens[index];
    if (
      token === undefined ||
      stopWords.has(token.text.toLowerCase()) ||
      taken.length >= MAX_SOURCE_TOKENS_BEFORE_VERB
    ) {
      break;
    }
    taken.unshift(token);
  }
  return taken;
}

export function extractAttributions(
  normalized: string,
  rules: LanguageRules,
): AttributionMention[] {
  const mentions: AttributionMention[] = [];
  const framingOf = (rulesList: readonly FramingRule[], id: string): FramingRule["framing"] =>
    rulesList.find((rule) => rule.id === id)?.framing ?? "neutral";

  for (const hit of findMarkers(normalized, rules.attributionPrefixes)) {
    const tokens = sourceAfter(normalized, hit.span.end, rules);
    const source = cleanSource(tokens, rules);
    const last = tokens[tokens.length - 1];
    if (source && last) {
      mentions.push({
        source,
        script: scriptOf(source),
        framing: framingOf(rules.attributionPrefixes, hit.id),
        span: { start: hit.span.start, end: last.end },
      });
    }
  }

  for (const hit of findMarkers(normalized, rules.attributionVerbs)) {
    const tokens = sourceBefore(normalized, hit.span.start, rules);
    const source = cleanSource(tokens, rules);
    const first = tokens[0];
    if (source && first) {
      mentions.push({
        source,
        script: scriptOf(source),
        framing: framingOf(rules.attributionVerbs, hit.id),
        span: { start: first.start, end: hit.span.end },
      });
    }
  }

  return mentions.sort((first, second) => first.span.start - second.span.start);
}

// Names cannot be compared across scripts, so only their presence is compared then.
export function sourcesMatch(first: AttributionMention, second: AttributionMention): boolean {
  if (first.script !== second.script) {
    return true;
  }
  if (first.source === second.source) {
    return true;
  }
  const [shorter, longer] =
    first.source.length <= second.source.length
      ? [first.source, second.source]
      : [second.source, first.source];
  return shorter.length >= 3 && longer.includes(shorter);
}
