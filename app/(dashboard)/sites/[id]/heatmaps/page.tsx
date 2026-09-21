import { DateFilter } from "@/components/DateFilter";
import { EmptyState } from "@/components/ui";
import { HeatmapView } from "@/components/HeatmapView";
import { PageHeader } from "@/components/PageHeader";
import { requireWebsite } from "@/lib/auth";
import { parseRange, toISO, ymd } from "@/lib/dates";

type HeatmapType = "clicks" | "movement" | "scroll";
type Device = "desktop" | "mobile" | "tablet";

async function loadHeatmapData(
  supabase: Awaited<ReturnType<typeof requireWebsite>>["supabase"],
  websiteId: string,
  path: string,
  device: Device,
  type: HeatmapType,
  range: { from: Date; to: Date },
) {
  if (type === "clicks") {
    const { data } = await supabase
      .from("heatmap_clicks")
      .select("x_rel, y_rel")
      .eq("website_id", websiteId)
      .eq("path", path)
      .eq("device_type", device)
      .gte("occurred_at", toISO(range.from))
      .lt("occurred_at", toISO(range.to))
      .limit(2000);
    return { clicks: data || [], moves: [], scrolls: [] };
  }
  if (type === "movement") {
    const { data } = await supabase
      .from("heatmap_moves")
      .select("gx, gy, hits")
      .eq("website_id", websiteId)
      .eq("path", path)
      .eq("device_type", device)
      .gte("day", ymd(range.from))
      .lt("day", ymd(range.to));
    return { clicks: [], moves: data || [], scrolls: [] };
  }
  const { data } = await supabase
    .from("heatmap_scrolls")
    .select("depth")
    .eq("website_id", websiteId)
    .eq("path", path)
    .eq("device_type", device)
    .gte("occurred_at", toISO(range.from))
    .lt("occurred_at", toISO(range.to));
  const counts = new Map<number, number>();
  for (const row of data || []) {
    counts.set(row.depth, (counts.get(row.depth) || 0) + 1);
  }
  return {
    clicks: [],
    moves: [],
    scrolls: [...counts.entries()].map(([depth, count]) => ({ depth, count })),
  };
}

export default async function HeatmapsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    range?: string;
    from?: string;
    to?: string;
    path?: string;
    device?: string;
    type?: string;
  }>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const { supabase, website } = await requireWebsite(id);
  const range = parseRange(sp);
  const type = (sp.type || "clicks") as "clicks" | "movement" | "scroll";
  const device = (sp.device || "desktop") as "desktop" | "mobile" | "tablet";
  const requestedPath = sp.path;

  const pathsPromise = supabase.rpc("heatmap_paths", {
    p_website_id: website.id,
    p_from: toISO(range.from),
    p_to: toISO(range.to),
  });

  const [pathsResult, firstData] = requestedPath
    ? await Promise.all([pathsPromise, loadHeatmapData(supabase, website.id, requestedPath, device, type, range)])
    : [await pathsPromise, null];

  const pagePaths = ((pathsResult.data || []) as { page_path: string }[]).map(
    (p) => p.page_path,
  );
  const path = requestedPath || pagePaths[0] || "/";
  const loaded =
    firstData ||
    (await loadHeatmapData(supabase, website.id, path, device, type, range));
  const { clicks, moves, scrolls } = loaded;

  const empty =
    (type === "clicks" && !clicks.length) ||
    (type === "movement" && !moves.length) ||
    (type === "scroll" && !scrolls.length);

  const iframeSrc = `https://${website.domain}${path.startsWith("/") ? path : `/${path}`}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Heatmaps"
        actions={
          <DateFilter
            base={`/sites/${website.id}/heatmaps`}
            current={range.key}
            from={range.from}
            to={range.to}
          />
        }
      />

      <form className="card flex flex-wrap gap-3 p-4 text-[15px]">
        <input type="hidden" name="range" value={range.key} />
        <label>
          Page
          <select name="path" defaultValue={path} className="ml-2 rounded-lg border border-ink/15 bg-paper px-2 py-1">
            {(pagePaths.length ? pagePaths : ["/"]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>
        <label>
          Device
          <select name="device" defaultValue={device} className="ml-2 rounded-lg border border-ink/15 bg-paper px-2 py-1">
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="tablet">Tablet</option>
          </select>
        </label>
        <label>
          Type
          <select name="type" defaultValue={type} className="ml-2 rounded-lg border border-ink/15 bg-paper px-2 py-1">
            <option value="clicks">Clicks</option>
            <option value="movement">Movement</option>
            <option value="scroll">Scroll</option>
          </select>
        </label>
        <button className="btn" type="submit">
          View
        </button>
      </form>

      {empty ? (
        <EmptyState installHref={`/sites/${website.id}/install`} />
      ) : (
        <HeatmapView
          type={type}
          clicks={clicks}
          moves={moves}
          scrolls={scrolls}
          iframeSrc={iframeSrc}
        />
      )}
      <p className="text-xs text-muted">
        Overlay uses the live page when it can be framed. Many sites block iframes; the heatmap
        still plots using stored click, move, and scroll positions.
      </p>
    </div>
  );
}
