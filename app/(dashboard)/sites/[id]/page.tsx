import { Card, EmptyState, LineChart } from "@/components/ui";
import { DateFilter } from "@/components/DateFilter";
import { PageHeader } from "@/components/PageHeader";
import { requireWebsite } from "@/lib/auth";
import { parseRange, toISO } from "@/lib/dates";
import { formatDuration, formatNumber, percentChange } from "@/lib/format";

export default async function OverviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, website } = await requireWebsite(id);
  const range = parseRange(sp);

  const [{ data: overview }, { data: series }] = await Promise.all([
    supabase.rpc("analytics_overview", {
      p_website_id: website.id,
      p_from: toISO(range.from),
      p_to: toISO(range.to),
    }),
    supabase.rpc("analytics_timeseries", {
      p_website_id: website.id,
      p_from: toISO(range.from),
      p_to: toISO(range.to),
    }),
  ]);

  const stats = overview as {
    visitors: number;
    sessions: number;
    pageviews: number;
    pages_per_session: number;
    avg_session_duration: number;
    previous: {
      visitors: number;
      sessions: number;
      pageviews: number;
      pages_per_session: number;
      avg_session_duration: number;
    };
  } | null;

  const empty = !stats || stats.pageviews === 0;
  const hint = (cur: number, prev: number) => {
    const p = percentChange(cur, prev);
    return `${p >= 0 ? "+" : ""}${p}% vs previous period`;
  };

  return (
    <div>
      <PageHeader
        title={website.name}
        subtitle={website.domain}
        actions={
          <DateFilter
            base={`/sites/${website.id}`}
            current={range.key}
            from={range.from}
            to={range.to}
          />
        }
      />

      {empty ? (
        <EmptyState installHref={`/sites/${website.id}/install`} />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card title="Visitors" value={formatNumber(stats.visitors)} hint={hint(stats.visitors, stats.previous.visitors)} />
            <Card title="Sessions" value={formatNumber(stats.sessions)} hint={hint(stats.sessions, stats.previous.sessions)} />
            <Card title="Pageviews" value={formatNumber(stats.pageviews)} hint={hint(stats.pageviews, stats.previous.pageviews)} />
            <Card title="Pages / session" value={String(stats.pages_per_session)} />
            <Card title="Avg. duration" value={formatDuration(stats.avg_session_duration)} />
          </div>
          <LineChart
            data={((series as { bucket_day: string; visitors: number }[]) || []).map((d) => ({
              label: String(d.bucket_day).slice(5),
              value: d.visitors,
            }))}
          />
        </div>
      )}
    </div>
  );
}
