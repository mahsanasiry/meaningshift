import { findMarkers, type MarkerHit } from "../markers";
import { alignMentions } from "../pairing";
import { makeHighlight, quote } from "../text";
import type { DetectedDifference, DetectionContext, Detector, VersionAnalysis } from "../types";

const DETECTOR_ID = "certainty";

type CertaintyHit = MarkerHit & { readonly strength: number };

function hitsOf(version: VersionAnalysis): CertaintyHit[] {
  const strengthById = new Map(version.rules.certainty.map((rule) => [rule.id, rule.strength]));
  return findMarkers(version.normalized, version.rules.certainty).map((hit) => ({
    ...hit,
    strength: strengthById.get(hit.id) ?? 0,
  }));
}

function role(hit: CertaintyHit): string {
  return hit.strength < 0 ? "a hedge" : "a strengthening word";
}

function describe(
  a: CertaintyHit | null,
  b: CertaintyHit | null,
  context: DetectionContext,
): string {
  const excerptA = a ? quote(context.a.text.slice(a.span.start, a.span.end)) : "";
  const excerptB = b ? quote(context.b.text.slice(b.span.start, b.span.end)) : "";
  if (a && b) {
    const direction =
      b.strength > a.strength
        ? "Version B sounds more certain."
        : b.strength < a.strength
          ? "Version B sounds less certain."
          : "The strength is similar but the wording differs.";
    return `Possible certainty difference: ${excerptA} in version A, ${excerptB} in version B. ${direction}`;
  }
  if (a) {
    return `Possible certainty difference: ${excerptA} (${role(a)}) appears only in version A.`;
  }
  return b
    ? `Possible certainty difference: ${excerptB} (${role(b)}) appears only in version B.`
    : "";
}

export const certaintyDetector: Detector = {
  id: DETECTOR_ID,
  category: "certainty",
  detect(context) {
    const { unmatched } = alignMentions(hitsOf(context.a), hitsOf(context.b), {
      equivalent: (first, second) => first.id === second.id,
    });

    return unmatched.map(({ a, b }): DetectedDifference => ({
      category: "certainty",
      detectorId: DETECTOR_ID,
      fingerprint: `certainty:${a?.id ?? "-"}>${b?.id ?? "-"}`,
      summary: describe(a, b, context),
      a: a ? makeHighlight(context.a.text, a.span) : null,
      b: b ? makeHighlight(context.b.text, b.span) : null,
    }));
  },
};
