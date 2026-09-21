export function EmptyState({ installHref }: { installHref?: string }) {
  return (
    <div className="card px-6 py-20 text-center">
      <p className="display text-3xl text-ink">No traffic yet</p>
      <p className="mx-auto mt-4 max-w-md text-muted">
        Install the tracker on this website. Numbers show up here once people use it.
      </p>
      {installHref ? (
        <a href={installHref} className="btn mt-8">
          View install
        </a>
      ) : null}
    </div>
  );
}

export function Card({
  title,
  value,
  hint,
}: {
  title: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="card p-6">
      <p className="label-ui text-muted">{title}</p>
      <p className="display mt-4 text-[2rem] text-ink">{value}</p>
      {hint ? <p className="mt-2 text-sm text-muted">{hint}</p> : null}
    </div>
  );
}

export function Table({
  columns,
  rows,
}: {
  columns: string[];
  rows: (string | number)[][];
}) {
  if (!rows.length) return null;
  return (
    <div className="card overflow-x-auto">
      <table className="min-w-full text-[15px]">
        <thead className="text-left">
          <tr>
            {columns.map((c) => (
              <th key={c} className="label-ui px-4 py-4 text-muted">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-t border-ink/10">
              {row.map((cell, j) => (
                <td key={j} className="px-4 py-4">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function LineChart({
  data,
}: {
  data: { label: string; value: number }[];
}) {
  const w = 720;
  const h = 220;
  const max = Math.max(...data.map((d) => d.value), 1);
  const pad = 28;
  const pts = data.map((d, i) => {
    const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
    const y = h - pad - (d.value / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <div className="card p-6">
      <p className="label-ui text-muted">Traffic</p>
      <svg viewBox={`0 0 ${w} ${h}`} className="mt-4 h-56 w-full">
        <polyline
          fill="none"
          stroke="#111111"
          strokeWidth="2.5"
          points={pts.join(" ")}
        />
        {data.map((d, i) => {
          const x = pad + (i / Math.max(data.length - 1, 1)) * (w - pad * 2);
          const y = h - pad - (d.value / max) * (h - pad * 2);
          return <circle key={`${d.label}-${i}`} cx={x} cy={y} r="3" fill="#dc9feb" />;
        })}
      </svg>
      <div className="mt-1 flex justify-between text-sm text-muted">
        <span>{data[0]?.label}</span>
        <span>{data[data.length - 1]?.label}</span>
      </div>
    </div>
  );
}

export function BarList({
  items,
}: {
  items: { label: string; value: number }[];
}) {
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <div key={item.label}>
          <div className="mb-2 flex justify-between text-[15px]">
            <span className="capitalize">{item.label}</span>
            <span className="text-muted">{item.value}</span>
          </div>
          <div className="h-2 rounded-full bg-ink/8">
            <div
              className="h-2 rounded-full bg-ink"
              style={{ width: `${(item.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
