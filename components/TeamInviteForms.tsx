"use client";

import { useActionState } from "react";
import { CopyButton } from "@/components/CopyButton";
import { FieldHint } from "@/components/FieldHint";
import {
  createInvite,
  type InviteActionState,
} from "@/app/(dashboard)/sites/actions";

function InviteResult({ state }: { state: InviteActionState }) {
  if (!state) return null;
  if (state.error) {
    return <p className="mt-3 text-sm text-deep">{state.error}</p>;
  }
  return (
    <div className="mt-4 space-y-3 rounded-lg border border-ink/10 bg-paper p-4 text-sm">
      {state.emailSent ? (
        <p className="text-ink">Email sent. They’ll open the link and create a password.</p>
      ) : null}
      {state.emailError ? <p className="text-deep">{state.emailError}</p> : null}
      {state.code ? (
        <div>
          <p className="font-medium text-ink">Share this with the client</p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded-lg bg-cream px-2 py-1 font-mono text-base tracking-wide">
              {state.code}
            </code>
            <CopyButton value={state.code} />
          </div>
          {state.joinUrl ? (
            <div className="mt-3">
              <p className="text-xs text-muted">Join link — opens the create-password page</p>
              <div className="mt-1 flex items-center gap-2">
                <p className="min-w-0 truncate font-mono text-xs text-muted">{state.joinUrl}</p>
                <CopyButton value={state.joinUrl} label="Copy link" />
              </div>
            </div>
          ) : null}
          {state.expiresAt ? (
            <p className="mt-2 text-xs text-muted">
              Valid until {new Date(state.expiresAt).toLocaleString()}. One-time use.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function TeamInviteForms({ websiteId }: { websiteId: string }) {
  const [state, action, pending] = useActionState(createInvite, null);

  return (
    <form action={action} className="card p-6">
      <h2 className="inline-flex items-center font-medium">
        Invite a client
        <FieldHint label="How client invites work">
          A 72-hour code is enough. Share the code or join link — they create a password. Email is optional and only sends that same join link.
        </FieldHint>
      </h2>
      <p className="mt-1 text-sm text-muted">
        They land on a create-password page. They only see this website.
      </p>
      <input type="hidden" name="id" value={websiteId} />
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          name="email"
          placeholder="client@example.com (optional)"
          className="field mt-0 flex-1"
        />
        <button className="btn disabled:opacity-60" disabled={pending} type="submit">
          {pending ? "Creating" : "Create invite"}
        </button>
      </div>
      <InviteResult state={state} />
    </form>
  );
}
