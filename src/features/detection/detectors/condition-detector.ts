import { findMarkers, type MarkerHit } from "../markers";
import { alignMentions } from "../pairing";
import { clauseFrom, makeHighlight, quote } from "../text";
import type { DetectedDifference, DetectionContext, Detector, VersionAnalysis } from "../types";

const DETECTOR_ID = "conditions";

function hitsOf(version: VersionAnalysis): MarkerHit[] {
  return findMarkers(version.normalized, version.rules.conditions);
}

function clauseOf(version: VersionAnalysis, hit: MarkerHit): string {
  return clauseFrom(version.text, hit.span.start);
}

function describe(a: MarkerHit | null, b: MarkerHit | null, context: DetectionContext): string {
  const clauseA = a ? quote(clauseOf(context.a, a)) : "";
  const clauseB = b ? quote(clauseOf(context.b, b)) : "";
  if (a && b) {
    return `Possible condition difference: ${clauseA} in version A, ${clauseB} in version B.`;
  }
  if (a) {
    return `Possible condition difference: version A has the condition ${clauseA} that version B does not.`;
  }
  return `Possible condition difference: version B has the condition ${clauseB} that version A does not.`;
}

export const conditionDetector: Detector = {
  id: DETECTOR_ID,
  category: "condition",
  detect(context) {
    const { unmatched } = alignMentions(hitsOf(context.a), hitsOf(context.b), {
      equivalent: (first, second) => first.id === second.id,
    });

    return unmatched.map(({ a, b }): DetectedDifference => ({
      category: "condition",
      detectorId: DETECTOR_ID,
      fingerprint: `condition:${a?.id ?? "-"}>${b?.id ?? "-"}`,
      summary: describe(a, b, context),
      a: a ? makeHighlight(context.a.text, a.span) : null,
      b: b ? makeHighlight(context.b.text, b.span) : null,
    }));
  },
};
