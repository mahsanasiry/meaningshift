import { makeHighlight, overlapsAny, quote } from "../text";
import type { DetectedDifference, Detector, Span } from "../types";

const DETECTOR_ID = "wording";
const MAX_HUNKS = 20;

type Token = { readonly word: string; readonly span: Span };

type Hunk = {
  aStart: number;
  aEnd: number;
  bStart: number;
  bEnd: number;
};

function tokensOf(normalized: string): Token[] {
  return [...normalized.matchAll(/[\p{L}\p{N}]+/gu)].map((match) => ({
    word: match[0].toLowerCase(),
    span: { start: match.index, end: match.index + match[0].length },
  }));
}

// Longest common subsequence over words; returns the aligned index pairs in order.
function alignWords(a: readonly Token[], b: readonly Token[]): Array<readonly [number, number]> {
  const width = b.length + 1;
  const table = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      table[i * width + j] =
        a[i]?.word === b[j]?.word
          ? (table[(i + 1) * width + j + 1] ?? 0) + 1
          : Math.max(table[(i + 1) * width + j] ?? 0, table[i * width + j + 1] ?? 0);
    }
  }

  const pairs: Array<readonly [number, number]> = [];
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i]?.word === b[j]?.word) {
      pairs.push([i, j]);
      i += 1;
      j += 1;
    } else if ((table[(i + 1) * width + j] ?? 0) >= (table[i * width + j + 1] ?? 0)) {
      i += 1;
    } else {
      j += 1;
    }
  }
  return pairs;
}

function findHunks(a: readonly Token[], b: readonly Token[]): Hunk[] {
  const anchors: Array<readonly [number, number]> = [...alignWords(a, b), [a.length, b.length]];
  const hunks: Hunk[] = [];
  let previousA = 0;
  let previousB = 0;

  for (const [anchorA, anchorB] of anchors) {
    if (anchorA > previousA || anchorB > previousB) {
      const last = hunks[hunks.length - 1];
      // Two changes separated by a single shared word read as one rewording.
      if (last && last.aEnd + 1 === previousA && last.bEnd + 1 === previousB) {
        last.aEnd = anchorA;
        last.bEnd = anchorB;
      } else {
        hunks.push({ aStart: previousA, aEnd: anchorA, bStart: previousB, bEnd: anchorB });
      }
    }
    previousA = anchorA + 1;
    previousB = anchorB + 1;
  }
  return hunks;
}

function spanOfTokens(tokens: readonly Token[], start: number, end: number): Span | null {
  const first = tokens[start];
  const last = tokens[end - 1];
  return end > start && first && last ? { start: first.span.start, end: last.span.end } : null;
}

export const stylisticDetector: Detector = {
  id: DETECTOR_ID,
  category: "stylistic",
  detect(context) {
    // Wording can only be compared within one language.
    if (context.a.rules.code !== context.b.rules.code) {
      return [];
    }

    const tokensA = tokensOf(context.a.normalized);
    const tokensB = tokensOf(context.b.normalized);
    const flaggedA = context.previous.flatMap((item) => (item.a ? [item.a.span] : []));
    const flaggedB = context.previous.flatMap((item) => (item.b ? [item.b.span] : []));

    const differences: DetectedDifference[] = [];
    for (const hunk of findHunks(tokensA, tokensB).slice(0, MAX_HUNKS)) {
      const spanA = spanOfTokens(tokensA, hunk.aStart, hunk.aEnd);
      const spanB = spanOfTokens(tokensB, hunk.bStart, hunk.bEnd);
      if ((spanA && overlapsAny(spanA, flaggedA)) || (spanB && overlapsAny(spanB, flaggedB))) {
        continue;
      }

      const textA = spanA ? context.a.text.slice(spanA.start, spanA.end) : "";
      const textB = spanB ? context.b.text.slice(spanB.start, spanB.end) : "";
      let summary: string;
      if (spanA && spanB) {
        summary = `Possible wording difference: ${quote(textA)} in version A, ${quote(textB)} in version B.`;
      } else if (spanA) {
        summary = `Possible wording difference: ${quote(textA)} appears only in version A.`;
      } else {
        summary = `Possible wording difference: ${quote(textB)} appears only in version B.`;
      }

      differences.push({
        category: "stylistic",
        detectorId: DETECTOR_ID,
        fingerprint: `wording:${textA.toLowerCase().slice(0, 100)}>${textB.toLowerCase().slice(0, 100)}`,
        summary,
        a: spanA ? makeHighlight(context.a.text, spanA) : null,
        b: spanB ? makeHighlight(context.b.text, spanB) : null,
      });
    }
    return differences;
  },
};
