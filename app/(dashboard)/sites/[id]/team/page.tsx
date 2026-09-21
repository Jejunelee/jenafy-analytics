import { redirect } from "next/navigation";
import { removeMember, revokeInviteCode } from "../../actions";
import { CopyButton } from "@/components/CopyButton";
import { FieldHint } from "@/components/FieldHint";
import { PageHeader } from "@/components/PageHeader";
import { TeamInviteForms } from "@/components/TeamInviteForms";
import { requireWebsite } from "@/lib/auth";
import { formatInviteCode, joinPath } from "@/lib/invite";
import { requestOrigin } from "@/lib/origin";

export default async function TeamPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, profile, website } = await requireWebsite(id);
  if (profile.global_role !== "owner") redirect(`/sites/${id}`);
  const origin = await requestOrigin();

  const { data: members } = await supabase
    .from("website_members")
    .select("user_id, role")
    .eq("website_id", website.id);

  const ids = (members || []).map((m) => m.user_id);
  const { data: people } = ids.length
    ? await supabase.from("profiles").select("id, email").in("id", ids)
    : { data: [] as { id: string; email: string }[] };

  const emailById = new Map((people || []).map((p) => [p.id, p.email]));

  const { data: codes } = await supabase
    .from("invite_codes")
    .select("id, code, email, expires_at, redeemed_at")
    .eq("website_id", website.id)
    .is("redeemed_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        subtitle="People who can view this website’s analytics"
      />
      <div className="card">
        {(members || []).length ? (
          (members || []).map((m) => (
            <div
              key={m.user_id}
              className="flex items-center justify-between border-b border-ink/10 px-5 py-4 last:border-0"
            >
              <div>
                <p className="font-medium">{emailById.get(m.user_id) || "Member"}</p>
                <p className="text-sm text-muted">
                  {m.role === "owner" ? "Owner" : "Client"}
                </p>
              </div>
              {m.role !== "owner" ? (
                <form action={removeMember}>
                  <input type="hidden" name="id" value={website.id} />
                  <input type="hidden" name="user_id" value={m.user_id} />
                  <button className="text-sm text-deep" type="submit">
                    Remove
                  </button>
                </form>
              ) : (
                <span className="text-xs text-muted">You</span>
              )}
            </div>
          ))
        ) : (
          <p className="px-5 py-8 text-sm text-muted">No members yet.</p>
        )}
      </div>

      {codes?.length ? (
        <section className="card p-6">
          <h2 className="inline-flex items-center font-medium">
            Active invites
            <FieldHint label="What active invites are">
              Unused 72-hour codes. Share the code or the join link. After someone creates a password, it disappears.
            </FieldHint>
          </h2>
          <div className="mt-4 divide-y divide-ink/10">
            {codes.map((c) => {
              const formatted = formatInviteCode(c.code);
              const url = `${origin}${joinPath(formatted, c.email || undefined)}`;
              return (
                <div
                  key={c.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                >
                  <div>
                    <p className="font-mono text-sm">{formatted}</p>
                    <p className="text-xs text-muted">
                      {c.email ? `Sent to ${c.email} · ` : ""}
                      expires {new Date(c.expires_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <CopyButton value={formatted} label="Copy code" />
                    <CopyButton value={url} label="Copy link" />
                    <form action={revokeInviteCode}>
                      <input type="hidden" name="id" value={website.id} />
                      <input type="hidden" name="code_id" value={c.id} />
                      <button className="text-sm text-deep" type="submit">
                        Revoke
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <TeamInviteForms websiteId={website.id} />
    </div>
  );
}
