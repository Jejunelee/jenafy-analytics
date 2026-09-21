"use client";

import type { Website } from "@/lib/auth";

export function SiteSwitcher({
  websites,
  currentId,
}: {
  websites: Pick<Website, "id" | "name" | "domain">[];
  currentId: string;
}) {
  return (
    <label className="flex min-w-0 items-center gap-2">
      <span className="hidden text-sm text-muted sm:inline">Website</span>
      <select
        className="min-w-0 max-w-full rounded-lg border border-ink/15 bg-paper px-2 py-1.5 text-[15px] text-ink"
        value={currentId}
        onChange={(e) => {
          const next = e.target.value;
          const parts = window.location.pathname.split("/");
          const rest = parts.slice(3).join("/");
          const search = window.location.search;
          window.location.href = `/sites/${next}${rest ? `/${rest}` : ""}${search}`;
        }}
      >
        {websites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.name}
          </option>
        ))}
      </select>
    </label>
  );
}
