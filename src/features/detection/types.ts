import type { LanguageRules } from "./languages/types";

export type DifferenceCategory =
  "number" | "date" | "condition" | "certainty" | "attribution" | "stylistic";

export const DIFFERENCE_CATEGORIES: readonly DifferenceCategory[] = [
  "number",
  "date",
  "condition",
  "certainty",
  "attribution",
  "stylistic",
];

// Offsets are UTF-16 positions in the text exactly as the person wrote it.
export type Span = {
  readonly start: number;
  readonly end: number;
};

export type Highlight = {
  readonly span: Span;
  readonly excerpt: string;
};

export type DetectedDifference = {
  category: DifferenceCategory;
  detectorId: string;
  fingerprint: string;
  summary: string;
  a: Highlight | null;
  b: Highlight | null;
};

export type TextVersion = {
  readonly text: string;
  readonly language: string;
};

export type DetectionInput = {
  readonly a: TextVersion;
  readonly b: TextVersion;
};

export type VersionAnalysis = {
  readonly text: string;
  readonly normalized: string;
  readonly language: string;
  readonly rules: LanguageRules;
};

export type DetectionContext = {
  readonly a: VersionAnalysis;
  readonly b: VersionAnalysis;
  readonly previous: readonly DetectedDifference[];
};

// A detector looks at both versions and reports possible differences. It never
// decides whether a difference matters; that is the reviewer's job.
export interface Detector {
  readonly id: string;
  readonly category: DifferenceCategory;
  detect(context: DetectionContext): DetectedDifference[];
}
