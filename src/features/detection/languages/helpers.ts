import type { NumberWord, NumberWordKind } from "./types";

export function numberWordsOf(
  kind: NumberWordKind,
  entries: Readonly<Record<string, number>>,
): Record<string, NumberWord> {
  const words: Record<string, NumberWord> = {};
  for (const [word, value] of Object.entries(entries)) {
    words[word] = { value, kind };
  }
  return words;
}
