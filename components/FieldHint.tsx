"use client";

import { useRef, useState } from "react";

export function FieldHint({
  label,
  children,
  className = "border-ink/20 bg-paper text-muted hover:border-ink hover:text-ink",
}: {
  label: string;
  children: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);

  return (
    <span className="relative ml-1 inline-flex align-middle" ref={root}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        className={`inline-flex h-4 w-4 items-center justify-center rounded-full border text-[10px] font-semibold ${className}`}
        onClick={() => setOpen((v) => !v)}
        onBlur={(e) => {
          if (!root.current?.contains(e.relatedTarget as Node | null)) setOpen(false);
        }}
      >
        i
      </button>
      {open ? (
        <span
          role="tooltip"
          className="absolute left-0 top-6 z-20 w-64 rounded-lg border border-ink/10 bg-cream p-3 text-left text-xs leading-relaxed font-normal text-muted shadow-lg"
        >
          {children}
        </span>
      ) : null}
    </span>
  );
}
