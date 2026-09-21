export type RangeKey =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "90d"
  | "custom";

export function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function parseRange(search: {
  range?: string;
  from?: string;
  to?: string;
}) {
  const key = (search.range as RangeKey) || "30d";
  const now = new Date();
  const today = startOfDay(now);

  if (key === "today") {
    return { key, from: today, to: addDays(today, 1), label: "Today" };
  }
  if (key === "yesterday") {
    return {
      key,
      from: addDays(today, -1),
      to: today,
      label: "Yesterday",
    };
  }
  if (key === "7d") {
    return { key, from: addDays(today, -6), to: addDays(today, 1), label: "Last 7 days" };
  }
  if (key === "90d") {
    return { key, from: addDays(today, -89), to: addDays(today, 1), label: "Last 90 days" };
  }
  if (key === "custom" && search.from && search.to) {
    const from = startOfDay(new Date(search.from));
    const to = addDays(startOfDay(new Date(search.to)), 1);
    return { key, from, to, label: "Custom" };
  }
  return { key: "30d" as RangeKey, from: addDays(today, -29), to: addDays(today, 1), label: "Last 30 days" };
}

export function toISO(d: Date) {
  return d.toISOString();
}

export function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
