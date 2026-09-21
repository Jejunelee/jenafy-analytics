import Link from "next/link";
import { FieldHint } from "@/components/FieldHint";
import type { RangeKey } from "@/lib/dates";
import { addDays, ymd } from "@/lib/dates";

const ranges: { key: RangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "7d", label: "7 days" },
  { key: "30d", label: "30 days" },
  { key: "90d", label: "90 days" },
];

export function DateFilter({
  base,
  current,
  from,
  to,
}: {
  base: string;
  current: RangeKey;
  from: Date;
  to: Date;
}) {
  const fromVal = ymd(from);
  const toVal = ymd(addDays(to, -1));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {ranges.map((r) => (
        <Link
          key={r.key}
          href={`${base}?range=${r.key}`}
          className={`rounded-full px-3 py-1 text-[14px] whitespace-nowrap ${
            current === r.key
              ? "bg-ink text-cream"
              : "bg-cream text-muted ring-1 ring-ink/10 hover:text-ink"
          }`}
        >
          {r.label}
        </Link>
      ))}
      <form className="flex flex-wrap items-center gap-2 text-[14px]" action={base}>
        <input type="hidden" name="range" value="custom" />
        <input
          className="rounded-lg border border-ink/15 bg-paper px-2 py-1"
          type="date"
          name="from"
          defaultValue={fromVal}
          required
        />
        <span className="text-muted">to</span>
        <input
          className="rounded-lg border border-ink/15 bg-paper px-2 py-1"
          type="date"
          name="to"
          defaultValue={toVal}
          required
        />
        <button className="rounded-lg bg-cream px-2 py-1 ring-1 ring-ink/15" type="submit">
          Apply
        </button>
        <FieldHint label="How date ranges work">
          Presets compare against the previous period of the same length. Custom dates include both start and end days.
        </FieldHint>
      </form>
    </div>
  );
}
