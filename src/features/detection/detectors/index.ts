import type { Detector } from "../types";
import { attributionDetector } from "./attribution-detector";
import { certaintyDetector } from "./certainty-detector";
import { conditionDetector } from "./condition-detector";
import { dateDetector } from "./date-detector";
import { numberDetector } from "./number-detector";
import { stylisticDetector } from "./stylistic-detector";

// The wording detector must stay last: it skips text that an earlier detector already flagged.
export const DEFAULT_DETECTORS: readonly Detector[] = [
  numberDetector,
  dateDetector,
  conditionDetector,
  certaintyDetector,
  attributionDetector,
  stylisticDetector,
];
