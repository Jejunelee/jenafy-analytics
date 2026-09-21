import Link from "next/link";
import { DateFilter } from "@/components/DateFilter";
import { EmptyState } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { requireWebsite } from "@/lib/auth";
import { parseRange, toISO } from "@/lib/dates";
import { formatMs, formatNumber } from "@/lib/format";

type SortKey = "page_path" | "views" | "visitors" | "entrances" | "exits" | "avg_time_ms";

export default async function PagesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, website } = await requireWebsite(id);
  const range = parseRange(sp);
  const sort = (sp.sort as SortKey) || "views";
  const dir = sp.dir === "asc" ? "asc" : "desc";
  const { data } = await supabase.rpc("analytics_pages", {
    p_website_id: website.id,
    p_from: toISO(range.from),
    p_to: toISO(range.to),
  });
  const rows = (
    (data || []) as {
      page_path: string;
      views: number;
      visitors: number;
      entrances: number;
      exits: number;
      avg_time_ms: number;
    }[]
  ).sort((a, b) => {
    const av = a[sort];
    const bv = b[sort];
    if (typeof av === "string" && typeof bv === "string") {
      return dir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    }
    return dir === "asc" ? Number(av) - Number(bv) : Number(bv) - Number(av);
  });

  const qs = new URLSearchParams();
  qs.set("range", range.key);
  if (range.key === "custom") {
    qs.set("from", sp.from || "");
    qs.set("to", sp.to || "");
  }
  function href(key: SortKey) {
    const next = new URLSearchParams(qs);
    next.set("sort", key);
    next.set("dir", sort === key && dir === "desc" ? "asc" : "desc");
    return `/sites/${website.id}/pages?${next.toString()}`;
  }

  const columns: { key: SortKey; label: string }[] = [
    { key: "page_path", label: "Page" },
    { key: "views", label: "Views" },
    { key: "visitors", label: "Unique visitors" },
    { key: "entrances", label: "Entrances" },
    { key: "exits", label: "Exits" },
    { key: "avg_time_ms", label: "Avg. time" },
  ];

  return (
    <div>
      <PageHeader
        title="Pages"
        actions={
          <DateFilter
            base={`/sites/${website.id}/pages`}
            current={range.key}
            from={range.from}
            to={range.to}
          />
        }
      />
      {!rows.length ? (
        <EmptyState installHref={`/sites/${website.id}/install`} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="min-w-full text-[15px]">
            <thead className="text-left">
              <tr>
                {columns.map((c) => (
                  <th key={c.key} className="label-ui px-4 py-4 text-muted">
                    <Link href={href(c.key)} className="hover:text-ink">
                      {c.label}
                      {sort === c.key ? (dir === "desc" ? " ↓" : " ↑") : ""}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.page_path} className="border-t border-ink/10">
                  <td className="px-4 py-3 font-mono text-xs">{r.page_path}</td>
                  <td className="px-4 py-3">{formatNumber(r.views)}</td>
                  <td className="px-4 py-3">{formatNumber(r.visitors)}</td>
                  <td className="px-4 py-3">{formatNumber(r.entrances)}</td>
                  <td className="px-4 py-3">{formatNumber(r.exits)}</td>
                  <td className="px-4 py-3">{formatMs(r.avg_time_ms)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
