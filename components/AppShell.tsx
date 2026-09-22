"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { SubmitButton } from "@/components/SubmitButton";
import { signOut } from "@/app/login/actions";
import type { Profile, Website } from "@/lib/auth";
import { SiteSwitcher } from "@/components/SiteSwitcher";

const nav = [
  { href: "", label: "Overview" },
  { href: "/pages", label: "Pages" },
  { href: "/sources", label: "Sources" },
  { href: "/devices", label: "Devices" },
  { href: "/geo", label: "Geography" },
  { href: "/heatmaps", label: "Heatmaps" },
  { href: "/events", label: "Events" },
  { href: "/install", label: "Install" },
];

function siteIdFromPath(pathname: string) {
  const match = pathname.match(/^\/sites\/([^/]+)/);
  if (!match || match[1] === "new") return undefined;
  return match[1];
}

function navClass(on: boolean) {
  return `block rounded-lg px-3 py-2 text-[15px] ${
    on ? "bg-cream/10 font-medium text-cream" : "text-muted-dark hover:bg-cream/5 hover:text-cream"
  }`;
}

export function AppShell({
  profile,
  websites,
  children,
}: {
  profile: Profile;
  websites: Pick<Website, "id" | "name" | "domain">[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const currentId = siteIdFromPath(pathname);
  const current = websites.find((w) => w.id === currentId);
  const owner = profile.global_role === "owner";
  const siteNav = currentId
    ? [
        ...nav,
        ...(owner
          ? [
              { href: "/team", label: "Team" },
              { href: "/settings", label: "Settings" },
            ]
          : []),
      ]
    : [];

  function active(href: string) {
    if (!currentId) return false;
    const target = `/sites/${currentId}${href}`;
    if (href === "") return pathname === target;
    return pathname === target || pathname.startsWith(`${target}/`);
  }

  const sidebar = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="px-5 py-6">
        <Link href="/sites" className="block min-w-0" onClick={() => setOpen(false)}>
          <p className="label-ui text-pink">Jenafy</p>
          <p className="display mt-2 text-[1.75rem] text-cream">Analytics</p>
        </Link>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
        <p className="label-ui px-3 pb-2 text-muted-dark">Account</p>
        <Link
          href="/sites"
          onClick={() => setOpen(false)}
          className={navClass(pathname === "/sites" || pathname === "/sites/new")}
        >
          Websites
        </Link>
        {currentId ? (
          <>
            <p className="label-ui px-3 pt-5 pb-2 text-muted-dark">
              {current?.name || "Site"}
            </p>
            {siteNav.map((item) => (
              <Link
                key={item.href || "overview"}
                href={`/sites/${currentId}${item.href}`}
                onClick={() => setOpen(false)}
                className={navClass(active(item.href))}
              >
                {item.label}
              </Link>
            ))}
          </>
        ) : null}
      </nav>
      <div className="border-t border-cream/10 px-5 py-4 text-sm text-muted-dark">
        <p className="truncate text-cream">{profile.email}</p>
        <p className="mt-0.5 capitalize">{profile.global_role}</p>
        <form action={signOut} className="mt-3">
          <SubmitButton className="text-cream hover:text-pink" pendingLabel="Signing out">
            Sign out
          </SubmitButton>
        </form>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 overflow-hidden bg-ink text-cream md:block">
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            className="absolute inset-0 bg-ink/50"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          />
          <aside className="relative z-50 h-full w-72 max-w-[85vw] overflow-hidden bg-ink text-cream">
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-ink/10 bg-paper/90 px-4 backdrop-blur md:h-16 md:px-8">
          <button
            type="button"
            className="rounded-lg px-2 py-1 text-sm text-ink ring-1 ring-ink/15 md:hidden"
            onClick={() => setOpen(true)}
          >
            Menu
          </button>
          <div className="min-w-0 flex-1">
            {current ? (
              <SiteSwitcher websites={websites} currentId={current.id} />
            ) : (
              <p className="truncate text-sm font-medium text-ink">Websites</p>
            )}
          </div>
          {current ? (
            <p className="hidden truncate text-sm text-muted sm:block">{current.domain}</p>
          ) : null}
        </header>
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
          <div className="mx-auto w-full max-w-[1200px]">{children}</div>
        </main>
      </div>
    </div>
  );
}
