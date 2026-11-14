import { datesAreEquivalent, extractDates, type DateMention } from "../dates";
import { alignMentions } from "../pairing";
import { makeHighlight, quote } from "../text";
import type { DetectedDifference, DetectionContext, Detector } from "../types";

const DETECTOR_ID = "dates";

function describe(a: DateMention | null, b: DateMention | null, context: DetectionContext): string {
  const excerptA = a ? context.a.text.slice(a.span.start, a.span.end) : "";
  const excerptB = b ? context.b.text.slice(b.span.start, b.span.end) : "";
  if (a && b) {
    return `Possible date or time difference: ${quote(excerptA)} in version A, ${quote(excerptB)} in version B.`;
  }
  if (a) {
    return `Possible date or time difference: ${quote(excerptA)} appears only in version A.`;
  }
  return `Possible date or time difference: ${quote(excerptB)} appears only in version B.`;
}

export const dateDetector: Detector = {
  id: DETECTOR_ID,
  category: "date",
  detect(context) {
    const mentionsA = extractDates(context.a.text, context.a.normalized, context.a.rules);
    const mentionsB = extractDates(context.b.text, context.b.normalized, context.b.rules);
    const { unmatched } = alignMentions(mentionsA, mentionsB, {
      equivalent: datesAreEquivalent,
      groupOf: (mention) => mention.group,
    });

    return unmatched.map(({ a, b }): DetectedDifference => ({
      category: "date",
      detectorId: DETECTOR_ID,
      fingerprint: `date:${a?.key ?? "-"}>${b?.key ?? "-"}`,
      summary: describe(a, b, context),
      a: a ? makeHighlight(context.a.text, a.span) : null,
      b: b ? makeHighlight(context.b.text, b.span) : null,
    }));
  },
};
