import { extractAttributions, sourcesMatch, type AttributionMention } from "../attribution";
import { alignMentions } from "../pairing";
import { makeHighlight, quote } from "../text";
import type { DetectedDifference, Detector, VersionAnalysis } from "../types";

const DETECTOR_ID = "attribution";

function mentionsOf(version: VersionAnalysis): AttributionMention[] {
  return extractAttributions(version.normalized, version.rules);
}

function excerpt(version: VersionAnalysis, mention: AttributionMention): string {
  return quote(version.text.slice(mention.span.start, mention.span.end));
}

function fingerprintOf(mention: AttributionMention | null): string {
  return mention ? `${mention.source}|${mention.framing}` : "-";
}

export const attributionDetector: Detector = {
  id: DETECTOR_ID,
  category: "attribution",
  detect(context) {
    const { matched, unmatched } = alignMentions(mentionsOf(context.a), mentionsOf(context.b), {
      equivalent: sourcesMatch,
    });

    const differences: DetectedDifference[] = unmatched.map(({ a, b }) => {
      let summary: string;
      if (a && b) {
        summary = `Possible attribution difference: the claim is attributed to ${excerpt(context.a, a)} in version A and to ${excerpt(context.b, b)} in version B.`;
      } else if (a) {
        summary = `Possible attribution difference: version A attributes the claim (${excerpt(context.a, a)}) and version B does not.`;
      } else if (b) {
        summary = `Possible attribution difference: version B attributes the claim (${excerpt(context.b, b)}) and version A does not.`;
      } else {
        summary = "";
      }
      return {
        category: "attribution",
        detectorId: DETECTOR_ID,
        fingerprint: `attribution:${fingerprintOf(a)}>${fingerprintOf(b)}`,
        summary,
        a: a ? makeHighlight(context.a.text, a.span) : null,
        b: b ? makeHighlight(context.b.text, b.span) : null,
      };
    });

    for (const [a, b] of matched) {
      if (a.framing !== b.framing) {
        differences.push({
          category: "attribution",
          detectorId: DETECTOR_ID,
          fingerprint: `attribution:framing:${fingerprintOf(a)}>${fingerprintOf(b)}`,
          summary: `Possible attribution difference: ${excerpt(context.a, a)} in version A and ${excerpt(context.b, b)} in version B present the source differently.`,
          a: makeHighlight(context.a.text, a.span),
          b: makeHighlight(context.b.text, b.span),
        });
      }
    }
    return differences;
  },
};
