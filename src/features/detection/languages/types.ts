export type NumberWordKind = "add" | "times-hundred" | "scale";

export type NumberWord = {
  readonly value: number;
  readonly kind: NumberWordKind;
};

// Phrases are plain words; a space matches any run of whitespace.
export type PhraseRule = {
  readonly id: string;
  readonly phrases: readonly string[];
};

export type CertaintyRule = PhraseRule & {
  // Negative values hedge a claim, positive values strengthen it.
  readonly strength: number;
};

export type FramingRule = PhraseRule & {
  readonly framing: "neutral" | "distancing";
};

export type MonthRule = {
  readonly month: number;
  readonly calendar: "gregorian" | "jalali";
};

export type RelativeUnit = "day" | "week" | "month" | "year";

export interface LanguageRules {
  readonly code: string;
  readonly numberWords: Readonly<Record<string, NumberWord>>;
  readonly numberConnectors: readonly string[];
  // English joins "hundred and five"; Persian joins "twenty and five".
  readonly connectorJoinsSmallNumbers: boolean;
  readonly numberStopFollowers: readonly string[];
  readonly percentWords: readonly string[];
  readonly months: Readonly<Record<string, MonthRule>>;
  readonly monthContextWords: readonly string[];
  readonly yearPrefixes: readonly string[];
  readonly relativeDates: readonly PhraseRule[];
  readonly relativeUnits: Readonly<Record<string, RelativeUnit>>;
  readonly agoWords: readonly string[];
  readonly timePrefixes: readonly string[];
  readonly meridiemAm: readonly string[];
  readonly meridiemPm: readonly string[];
  readonly conditions: readonly PhraseRule[];
  readonly certainty: readonly CertaintyRule[];
  readonly attributionPrefixes: readonly FramingRule[];
  readonly attributionVerbs: readonly FramingRule[];
  readonly attributionStopWords: readonly string[];
  readonly sourceTrailingWords: readonly string[];
  readonly sourceFillers: readonly string[];
}
