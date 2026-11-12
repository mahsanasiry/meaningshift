import type { Span } from "./types";

export type MentionPair<T> = {
  readonly a: T | null;
  readonly b: T | null;
};

export type Alignment<T> = {
  readonly matched: ReadonlyArray<readonly [T, T]>;
  readonly unmatched: MentionPair<T>[];
};

type Positioned = { readonly span: Span };

type AlignOptions<T> = {
  equivalent: (a: T, b: T) => boolean;
  groupOf?: (item: T) => string;
};

function firstStart(pair: MentionPair<Positioned>): number {
  return Math.min(pair.a?.span.start ?? Infinity, pair.b?.span.start ?? Infinity);
}

// Mentions that have an equivalent on the other side are matched first. Of the rest,
// ones in the same group are paired in reading order as a change; anything left over
// is reported as present on one side only.
export function alignMentions<T extends Positioned>(
  listA: readonly T[],
  listB: readonly T[],
  options: AlignOptions<T>,
): Alignment<T> {
  const groupOf = options.groupOf ?? (() => "");
  const usedB = new Set<number>();
  const matched: Array<readonly [T, T]> = [];
  const leftoverA: T[] = [];

  for (const itemA of listA) {
    const index = listB.findIndex(
      (itemB, position) => !usedB.has(position) && options.equivalent(itemA, itemB),
    );
    const partner = index === -1 ? undefined : listB[index];
    if (partner === undefined) {
      leftoverA.push(itemA);
    } else {
      usedB.add(index);
      matched.push([itemA, partner]);
    }
  }

  const leftoverB = listB.filter((_, position) => !usedB.has(position));
  const unmatched: MentionPair<T>[] = [];

  for (const itemA of leftoverA) {
    const index = leftoverB.findIndex((itemB) => groupOf(itemB) === groupOf(itemA));
    const partner = index === -1 ? undefined : leftoverB[index];
    if (partner === undefined) {
      unmatched.push({ a: itemA, b: null });
    } else {
      leftoverB.splice(index, 1);
      unmatched.push({ a: itemA, b: partner });
    }
  }
  for (const itemB of leftoverB) {
    unmatched.push({ a: null, b: itemB });
  }

  unmatched.sort((first, second) => firstStart(first) - firstStart(second));
  return { matched, unmatched };
}
