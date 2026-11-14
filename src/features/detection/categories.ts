import type { DifferenceCategory } from "./types";

export const CATEGORY_LABELS: Record<DifferenceCategory, string> = {
  number: "Numbers",
  date: "Dates and times",
  condition: "Conditions",
  certainty: "Certainty and strength",
  attribution: "Source attribution",
  stylistic: "Wording only",
};

export const CATEGORY_DESCRIPTIONS: Record<DifferenceCategory, string> = {
  number: "A figure, amount or percentage differs.",
  date: "A date, time or time reference differs.",
  condition: "A condition such as if, unless or only when is added, removed or changed.",
  certainty:
    "A hedge or a strong word such as may, reportedly or always is added, removed or changed.",
  attribution: "Who is said to have said or done something differs.",
  stylistic: "The wording differs and no other category matched. It may still matter.",
};
