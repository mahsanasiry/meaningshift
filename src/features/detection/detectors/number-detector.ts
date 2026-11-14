import { extractDates } from "../dates";
import { extractNumbers, type NumberMention } from "../numbers";
import { alignMentions } from "../pairing";
import { makeHighlight, quote } from "../text";
import type { DetectedDifference, DetectionContext, Detector, VersionAnalysis } from "../types";

const DETECTOR_ID = "numbers";

function mentionsOf(version: VersionAnalysis): NumberMention[] {
  const dateSpans = extractDates(version.text, version.normalized, version.rules).map(
    (mention) => mention.span,
  );
  return extractNumbers(version.normalized, version.rules, dateSpans);
}

function describe(
  a: NumberMention | null,
  b: NumberMention | null,
  context: DetectionContext,
): string {
  const excerptA = a ? context.a.text.slice(a.span.start, a.span.end) : "";
  const excerptB = b ? context.b.text.slice(b.span.start, b.span.end) : "";
  if (a && b) {
    return `Possible number difference: ${quote(excerptA)} in version A, ${quote(excerptB)} in version B.`;
  }
  if (a) {
    return `Possible number difference: ${quote(excerptA)} appears only in version A.`;
  }
  return `Possible number difference: ${quote(excerptB)} appears only in version B.`;
}

export const numberDetector: Detector = {
  id: DETECTOR_ID,
  category: "number",
  detect(context) {
    const { unmatched } = alignMentions(mentionsOf(context.a), mentionsOf(context.b), {
      equivalent: (first, second) => first.key === second.key,
      groupOf: (mention) => (mention.percent ? "percent" : "plain"),
    });

    return unmatched.map(({ a, b }): DetectedDifference => ({
      category: "number",
      detectorId: DETECTOR_ID,
      fingerprint: `number:${a?.key ?? "-"}>${b?.key ?? "-"}`,
      summary: describe(a, b, context),
      a: a ? makeHighlight(context.a.text, a.span) : null,
      b: b ? makeHighlight(context.b.text, b.span) : null,
    }));
  },
};
