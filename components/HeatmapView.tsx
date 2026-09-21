"use client";

import { useEffect, useMemo, useRef } from "react";

type Click = { x_rel: number; y_rel: number };
type Move = { gx: number; gy: number; hits: number };

export function HeatmapView({
  type,
  clicks,
  moves,
  scrolls,
  iframeSrc,
}: {
  type: "clicks" | "movement" | "scroll";
  clicks: Click[];
  moves: Move[];
  scrolls: { depth: number; count: number }[];
  iframeSrc?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maxY = Math.max(1, ...clicks.map((c) => c.y_rel), 1);
  const canvasH = Math.round(720 * Math.min(maxY, 3));

  const scrollMax = useMemo(
    () => Math.max(...scrolls.map((s) => s.count), 1),
    [scrolls],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (type === "clicks") {
      clicks.forEach((c) => {
        const x = c.x_rel * w;
        const y = (c.y_rel / Math.max(maxY, 1)) * h;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 28);
        g.addColorStop(0, "rgba(220, 159, 235, 0.6)");
        g.addColorStop(1, "rgba(220, 159, 235, 0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 28, 0, Math.PI * 2);
        ctx.fill();
      });
    }

    if (type === "movement") {
      const max = Math.max(...moves.map((m) => m.hits), 1);
      moves.forEach((m) => {
        const cw = w / 40;
        const ch = h / 30;
        const a = 0.15 + (m.hits / max) * 0.55;
        ctx.fillStyle = `rgba(130, 69, 145, ${a})`;
        ctx.fillRect(m.gx * cw, m.gy * ch, cw, ch);
      });
    }
  }, [type, clicks, moves, maxY]);

  if (type === "scroll") {
    return (
      <div className="card p-6">
        <p className="label-ui mb-4 text-muted">Scroll depth</p>
        <div className="space-y-3">
          {[25, 50, 75, 90, 100].map((d) => {
            const row = scrolls.find((s) => s.depth === d);
            const n = row?.count || 0;
            return (
              <div key={d}>
                <div className="mb-1 flex justify-between text-[15px]">
                  <span>{d}% of page</span>
                  <span className="text-muted">{n} sessions</span>
                </div>
                <div className="h-2 rounded-full bg-ink/8">
                  <div
                    className="h-2 rounded-full bg-ink"
                    style={{ width: `${(n / scrollMax) * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="relative max-h-[720px] overflow-auto rounded-2xl border border-ink/10 bg-cream">
      {iframeSrc ? (
        <iframe
          title="Page preview"
          src={iframeSrc}
          loading="lazy"
          className="h-[720px] w-full bg-paper"
          sandbox="allow-scripts"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-[720px] items-center justify-center text-sm text-muted">
          Heatmap overlay
        </div>
      )}
      <canvas
        ref={canvasRef}
        width={1280}
        height={type === "clicks" ? canvasH : 720}
        className="pointer-events-none absolute inset-0 h-full w-full"
      />
    </div>
  );
}
