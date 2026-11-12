export { CATEGORY_DESCRIPTIONS, CATEGORY_LABELS } from "./categories";
export { DEFAULT_DETECTORS } from "./detectors";
export { detectDifferences } from "./engine";
export { UnsupportedLanguageError, getLanguageRules } from "./languages";
export { DIFFERENCE_CATEGORIES } from "./types";
export type {
  DetectedDifference,
  DetectionContext,
  DetectionInput,
  Detector,
  DifferenceCategory,
  Highlight,
  Span,
  TextVersion,
  VersionAnalysis,
} from "./types";
