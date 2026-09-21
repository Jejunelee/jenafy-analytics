export function formatNumber(n: number) {
  return new Intl.NumberFormat("en-US").format(Math.round(n || 0));
}

export function formatDuration(seconds: number) {
  const s = Math.max(0, Math.round(seconds || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    return `${h}h ${m % 60}m`;
  }
  if (m === 0) return `${r}s`;
  return `${m}m ${r}s`;
}

export function formatMs(ms: number) {
  return formatDuration((ms || 0) / 1000);
}

export function percentChange(current: number, previous: number) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export function countryName(code: string) {
  if (!code || code === "Unknown") return "Unknown";
  try {
    return (
      new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ||
      code
    );
  } catch {
    return code;
  }
}
