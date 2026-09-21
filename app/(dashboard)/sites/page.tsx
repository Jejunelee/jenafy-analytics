import Link from "next/link";
import { PageHeader } from "@/components/PageHeader";
import { requireUser } from "@/lib/auth";

export default async function SitesPage() {
  const { supabase, profile } = await requireUser();
  const { data: sites } = await supabase
    .from("websites")
    .select("id, public_id, name, domain, created_at")
    .order("created_at", { ascending: true });

  return (
    <div>
      <PageHeader
        title="Websites"
        subtitle="Properties you track with Jenafy Analytics"
        actions={
          profile.global_role === "owner" ? (
            <Link href="/sites/new" className="btn">
              Add website
            </Link>
          ) : null
        }
      />

      {!sites?.length ? (
        <div className="card px-6 py-16 text-center">
          <p className="display text-2xl">No websites yet</p>
          <p className="mx-auto mt-4 max-w-md text-muted">
            {profile.global_role === "owner"
              ? "Add a website to get a Site ID and installation snippet."
              : "Ask the owner for an invite code or join link, then create a password at /join."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sites.map((s) => (
            <Link
              key={s.id}
              href={`/sites/${s.id}`}
              className="card p-6 hover:border-ink"
            >
              <p className="display text-2xl text-ink">{s.name}</p>
              <p className="mt-2 text-muted">{s.domain}</p>
              <p className="mt-4 font-mono text-xs text-muted">{s.public_id}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
