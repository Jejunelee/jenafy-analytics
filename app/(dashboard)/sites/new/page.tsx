import { FieldHint } from "@/components/FieldHint";
import { PageHeader } from "@/components/PageHeader";
import { SubmitButton } from "@/components/SubmitButton";
import { requireUser } from "@/lib/auth";
import { createWebsite } from "../actions";

const errorCopy: Record<string, string> = {
  missing: "Enter a name and a hostname like example.com (no https://).",
  owner: "Only the workspace owner can add websites.",
  duplicate: "That website ID was already taken. Try creating it again.",
  create: "Could not create the website. Check the domain and try again.",
};

export default async function NewSitePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const q = await searchParams;
  await requireUser();
  const error = q.error ? errorCopy[q.error] || errorCopy.create : null;

  return (
    <div className="mx-auto max-w-lg">
      <PageHeader
        title="Add website"
        subtitle="You’ll get a Site ID and a one-line tracker snippet."
      />
      <form action={createWebsite} className="card space-y-4 p-6">
        <label className="block text-[15px]">
          <span className="inline-flex items-center">
            Name
            <FieldHint label="How to write the website name">
              A label only you and your clients see in this dashboard, such as a client or brand name. It does not have to match the domain.
            </FieldHint>
          </span>
          <input name="name" required className="field" placeholder="Client A" />
        </label>
        <label className="block text-[15px]">
          <span className="inline-flex items-center">
            Domain
            <FieldHint label="How to write the domain">
              Use the hostname only: example.com. You can paste a full URL; https://, www., and any path are stripped.
            </FieldHint>
          </span>
          <input name="domain" required className="field" placeholder="example.com" />
          <span className="mt-1 block text-xs text-muted">
            Example: example.com — not https://www.example.com/home
          </span>
        </label>
        {error ? <p className="text-sm text-deep">{error}</p> : null}
        <SubmitButton pendingLabel="Creating">Create</SubmitButton>
      </form>
    </div>
  );
}
