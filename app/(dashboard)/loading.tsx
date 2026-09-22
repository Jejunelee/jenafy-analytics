export default function Loading() {
  return (
    <div className="animate-pulse space-y-4">
      <div className="h-10 w-48 rounded-lg bg-ink/8" />
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="h-24 rounded-2xl bg-ink/8" />
        <div className="h-24 rounded-2xl bg-ink/8" />
        <div className="h-24 rounded-2xl bg-ink/8" />
      </div>
      <div className="h-64 rounded-2xl bg-ink/8" />
    </div>
  );
}
