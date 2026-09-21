import { DateFilter } from "@/components/DateFilter";
import { BarList, EmptyState } from "@/components/ui";
import { PageHeader } from "@/components/PageHeader";
import { requireWebsite } from "@/lib/auth";
import { parseRange, toISO } from "@/lib/dates";

export default async function DevicesPage({
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
  const { data } = await supabase.rpc("analytics_devices", {
    p_website_id: website.id,
    p_from: toISO(range.from),
    p_to: toISO(range.to),
  });
  const payload = (data || { devices: [], browsers: [], os: [] }) as {
    devices: { device: string; visitors: number; pageviews: number }[];
    browsers: { browser: string; visitors: number }[];
    os: { os: string; visitors: number }[];
  };
  const empty = !payload.devices.length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devices"
        actions={
          <DateFilter
            base={`/sites/${website.id}/devices`}
            current={range.key}
            from={range.from}
            to={range.to}
          />
        }
      />
      {empty ? (
        <EmptyState installHref={`/sites/${website.id}/install`} />
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="card p-6">
            <p className="label-ui mb-4 text-muted">Device type</p>
            <BarList items={payload.devices.map((d) => ({ label: d.device, value: d.visitors }))} />
          </div>
          <div className="card p-6">
            <p className="label-ui mb-4 text-muted">Browsers</p>
            <BarList items={payload.browsers.map((d) => ({ label: d.browser, value: d.visitors }))} />
          </div>
          <div className="card p-6">
            <p className="label-ui mb-4 text-muted">Operating system</p>
            <BarList items={payload.os.map((d) => ({ label: d.os, value: d.visitors }))} />
          </div>
        </div>
      )}
    </div>
  );
}
