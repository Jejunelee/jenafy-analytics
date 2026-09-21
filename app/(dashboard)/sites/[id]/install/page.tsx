import { CopyButton } from "@/components/CopyButton";
import { FieldHint } from "@/components/FieldHint";
import { PageHeader } from "@/components/PageHeader";
import { requireWebsite } from "@/lib/auth";
import { requestOrigin } from "@/lib/origin";

export default async function InstallPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { website } = await requireWebsite(id);
  const tracker = `${await requestOrigin()}/tracker.js`;
  const snippet = `<script defer src="${tracker}" data-site-id="${website.public_id}"></script>`;
  const nextSnippet = `import Script from "next/script";

// Root app/layout.tsx only — not nested layouts
<Script
  src="${tracker}"
  strategy="afterInteractive"
  data-site-id="${website.public_id}"
/>`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Install"
        subtitle={`Site ID ${website.public_id}`}
      />

      <section className="card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="inline-flex items-center font-medium">
            HTML / WordPress / Shopify / Squarespace
            <FieldHint label="Where to paste the tracker">
              Paste the snippet once on every page you want counted, ideally just before the closing head tag. Leave data-site-id unchanged.
            </FieldHint>
          </h2>
          <CopyButton value={snippet} />
        </div>
        <p className="mb-3 text-sm text-muted">
          Paste this just before <code>&lt;/head&gt;</code> or in your theme’s header script area.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-ink p-4 text-sm text-cream">
          {snippet}
        </pre>
      </section>

      <section className="card p-6">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="inline-flex items-center font-medium">
            Next.js
            <FieldHint label="How to install in Next.js">
              Add Script once in the root app/layout.tsx so it loads on every route. Nested layouts would load it twice.
            </FieldHint>
          </h2>
          <CopyButton value={nextSnippet} />
        </div>
        <p className="mb-3 text-sm text-muted">
          Add the script once in the root <code>app/layout.tsx</code>. Do not add it again in nested
          layouts.
        </p>
        <pre className="overflow-x-auto rounded-lg bg-ink p-4 text-sm text-cream">
          {nextSnippet}
        </pre>
      </section>

      <section className="card p-6 text-sm text-muted">
        <h2 className="mb-2 inline-flex items-center font-medium text-ink">
          Custom events
          <FieldHint label="How to name custom events">
            Use short snake_case names like signup or contact_form_submitted. Do not put emails, passwords, or payment data in the event name or properties.
          </FieldHint>
        </h2>
        <pre className="overflow-x-auto rounded-lg bg-ink p-4 text-cream">
          {`JenafyAnalytics.track("signup");
JenafyAnalytics.track("contact_form_submitted");`}
        </pre>
        <p className="mt-3">Do not send passwords, payment details, or other sensitive values.</p>
      </section>
    </div>
  );
}
