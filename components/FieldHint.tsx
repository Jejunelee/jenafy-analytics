export function FieldHint({
  label,
  children,
  className = "border-ink/20 bg-paper text-muted hover:border-ink hover:text-ink",
}: {
  label: string;
  children: string;
  className?: string;
}) {
  return (
    <span className="group relative ml-1 inline-flex align-middle">
      <button
        type="button"
        aria-label={label}
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-semibold ${className}`}
      >
        i
      </button>
      <span
        role="tooltip"
        className="pointer-events-none invisible absolute left-0 top-6 z-20 w-64 rounded-lg border border-ink/10 bg-cream p-3 text-left text-xs leading-relaxed font-normal text-muted shadow-lg group-hover:visible group-focus-within:visible"
      >
        {children}
      </span>
    </span>
  );
}
