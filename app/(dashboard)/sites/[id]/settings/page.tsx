import { redirect } from "next/navigation";
import { updateWebsite } from "../../actions";
import { DeleteSiteButton } from "@/components/DeleteSiteButton";
import { FieldHint } from "@/components/FieldHint";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { requireWebsite } from "@/lib/auth";

export default async function SettingsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { profile, website } = await requireWebsite(id);
  if (profile.global_role !== "owner") redirect(`/sites/${id}`);

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title="Settings" subtitle={website.domain} />
      <form action={updateWebsite} className="card space-y-4 p-6">
        <input type="hidden" name="id" value={website.id} />
        <label className="block text-[15px]">
          <span className="inline-flex items-center">
            Name
            <FieldHint label="How to write the website name">
              Dashboard label only. Changing it does not change tracking or the Site ID.
            </FieldHint>
          </span>
          <input name="name" defaultValue={website.name} className="field" />
        </label>
        <label className="block text-[15px]">
          <span className="inline-flex items-center">
            Domain
            <FieldHint label="How to write the domain">
              Hostname only, like example.com. Paste a full URL if you want — protocol, www, and path are removed.
            </FieldHint>
          </span>
          <input name="domain" defaultValue={website.domain} className="field" />
        </label>
        <p className="text-xs text-muted">
          Site ID: {website.public_id}
          <FieldHint label="What the Site ID is for">
            This ID is baked into the tracker snippet. Keep using the same snippet even if you rename the site.
          </FieldHint>
        </p>
        <SubmitButton pendingLabel="Saving">Save</SubmitButton>
      </form>
      <div className="rounded-2xl border border-deep/30 bg-cream p-6">
        <p className="text-sm text-deep">Remove this website and all of its analytics.</p>
        <DeleteSiteButton id={website.id} name={website.name} />
      </div>
    </div>
  );
}
