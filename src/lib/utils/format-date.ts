const formatter = new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" });

export function formatDate(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : formatter.format(date);
}
