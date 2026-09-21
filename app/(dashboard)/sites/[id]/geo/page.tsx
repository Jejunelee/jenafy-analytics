import { DateFilter } from "@/components/DateFilter";
import { EmptyState, Table } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { requireWebsite } from "@/lib/auth";
import { parseRange, toISO } from "@/lib/dates";
import { countryName, formatNumber } from "@/lib/format";

export default async function GeoPage({
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
  const { data } = await supabase.rpc("analytics_geo", {
    p_website_id: website.id,
    p_from: toISO(range.from),
    p_to: toISO(range.to),
  });
  const rows = (data || []) as { country_code: string; visitors: number; pageviews: number }[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Geography"
        subtitle="Country comes from the request edge (Vercel/Cloudflare). Raw IPs are not stored."
        actions={
          <DateFilter
            base={`/sites/${website.id}/geo`}
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
          columns={["Country", "Visitors", "Pageviews"]}
          rows={rows.map((r) => [
            countryName(r.country_code),
            formatNumber(r.visitors),
            formatNumber(r.pageviews),
          ])}
        />
      )}
    </div>
  );
}
