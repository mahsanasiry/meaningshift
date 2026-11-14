import { boundedAlternation, compactWhitespace } from "./text";
import type { PhraseRule } from "./languages/types";
import type { Span } from "./types";

export type MarkerHit = {
  readonly id: string;
  readonly span: Span;
};

export function findMarkers(normalized: string, rules: readonly PhraseRule[]): MarkerHit[] {
  const idByPhrase = new Map<string, string>();
  for (const rule of rules) {
    for (const phrase of rule.phrases) {
      idByPhrase.set(compactWhitespace(phrase).toLowerCase(), rule.id);
    }
  }

  const hits: MarkerHit[] = [];
  for (const match of normalized.matchAll(boundedAlternation([...idByPhrase.keys()]))) {
    const id = idByPhrase.get(compactWhitespace(match[0]).toLowerCase());
    if (id !== undefined) {
      hits.push({ id, span: { start: match.index, end: match.index + match[0].length } });
    }
  }
  return hits;
}
