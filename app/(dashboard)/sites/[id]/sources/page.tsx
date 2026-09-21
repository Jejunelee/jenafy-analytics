import { DateFilter } from "@/components/DateFilter";
import { BarList, EmptyState, Table } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { requireWebsite } from "@/lib/auth";
import { parseRange, toISO } from "@/lib/dates";
import { formatNumber } from "@/lib/format";

export default async function SourcesPage({
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
  const { data } = await supabase.rpc("analytics_sources", {
    p_website_id: website.id,
    p_from: toISO(range.from),
    p_to: toISO(range.to),
  });
  const payload = (data || {
    categories: [],
    campaigns: [],
    referrers: [],
  }) as {
    categories: { category: string; visitors: number; pageviews: number }[];
    campaigns: {
      source: string;
      medium: string;
      campaign: string;
      visitors: number;
      pageviews: number;
    }[];
    referrers: { referrer: string; visitors: number; pageviews: number }[];
  };

  const empty = !payload.categories.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Traffic sources"
        actions={
          <DateFilter
            base={`/sites/${website.id}/sources`}
            current={range.key}
            from={range.from}
            to={range.to}
          />
        }
      />
      {empty ? (
        <EmptyState installHref={`/sites/${website.id}/install`} />
      ) : (
        <>
          <div className="card p-6">
            <p className="label-ui mb-4 text-muted">Categories</p>
            <BarList
              items={payload.categories.map((c) => ({
                label: c.category,
                value: c.pageviews,
              }))}
            />
          </div>
          {payload.campaigns.length ? (
            <Table
              columns={["Source", "Medium", "Campaign", "Visitors", "Pageviews"]}
              rows={payload.campaigns.map((c) => [
                c.source || "—",
                c.medium || "—",
                c.campaign || "—",
                formatNumber(c.visitors),
                formatNumber(c.pageviews),
              ])}
            />
          ) : null}
          {payload.referrers.length ? (
            <Table
              columns={["Referrer", "Visitors", "Pageviews"]}
              rows={payload.referrers.map((r) => [
                r.referrer,
                formatNumber(r.visitors),
                formatNumber(r.pageviews),
              ])}
            />
          ) : null}
        </>
      )}
    </div>
  );
}
