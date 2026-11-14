import { DEFAULT_DETECTORS } from "./detectors";
import { getLanguageRules } from "./languages";
import { normalizeForMatching } from "./text";
import type {
  DetectedDifference,
  DetectionInput,
  Detector,
  TextVersion,
  VersionAnalysis,
} from "./types";

function analyse(version: TextVersion): VersionAnalysis {
  return {
    text: version.text,
    normalized: normalizeForMatching(version.text),
    language: version.language,
    rules: getLanguageRules(version.language),
  };
}

function position(difference: DetectedDifference): number {
  return Math.min(difference.a?.span.start ?? Infinity, difference.b?.span.start ?? Infinity);
}

// The database keeps one row per fingerprint and pair, so repeats get a numbered suffix.
function withUniqueFingerprints(differences: DetectedDifference[]): DetectedDifference[] {
  const seen = new Map<string, number>();
  return differences.map((difference) => {
    const count = (seen.get(difference.fingerprint) ?? 0) + 1;
    seen.set(difference.fingerprint, count);
    return count === 1
      ? difference
      : { ...difference, fingerprint: `${difference.fingerprint}~${count}` };
  });
}

export function detectDifferences(
  input: DetectionInput,
  detectors: readonly Detector[] = DEFAULT_DETECTORS,
): DetectedDifference[] {
  const a = analyse(input.a);
  const b = analyse(input.b);

  const found: DetectedDifference[] = [];
  for (const detector of detectors) {
    found.push(...detector.detect({ a, b, previous: [...found] }));
  }

  return withUniqueFingerprints(
    found
      .map((difference, order) => ({ difference, order }))
      .sort((first, second) => {
        const byPosition = position(first.difference) - position(second.difference);
        return byPosition !== 0 && Number.isFinite(byPosition)
          ? byPosition
          : first.order - second.order;
      })
      .map(({ difference }) => difference),
  );
}
