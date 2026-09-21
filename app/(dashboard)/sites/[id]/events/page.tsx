import { DateFilter } from "@/components/DateFilter";
import { EmptyState, Table } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { requireWebsite } from "@/lib/auth";
import { parseRange, toISO } from "@/lib/dates";
import { formatNumber } from "@/lib/format";

export default async function EventsPage({
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
  const { data } = await supabase.rpc("analytics_events", {
    p_website_id: website.id,
    p_from: toISO(range.from),
    p_to: toISO(range.to),
  });
  const rows = (data || []) as { event_name: string; event_count: number; visitors: number }[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        subtitle='JenafyAnalytics.track("signup")'
        actions={
          <DateFilter
            base={`/sites/${website.id}/events`}
            current={range.key}
            from={range.from}
            to={range.to}
          />
        }
      />
      {!rows.length ? (
        <EmptyState installHref={`/sites/${website.id}/install`} />
      ) : (
        <Table
          columns={["Event", "Count", "Unique visitors"]}
          rows={rows.map((r) => [r.event_name, formatNumber(r.event_count), formatNumber(r.visitors)])}
        />
      )}
    </div>
  );
}
