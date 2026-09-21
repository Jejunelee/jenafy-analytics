"use client";

import { useActionState } from "react";
import Link from "next/link";
import { AuthCard, authInputClass } from "@/components/AuthCard";
import { FieldHint } from "@/components/FieldHint";
import { joinWithInvite } from "./actions";

export function JoinForm({
  code,
  email,
  siteName,
  siteDomain,
  invalid,
}: {
  code?: string;
  email?: string;
  siteName?: string;
  siteDomain?: string;
  invalid?: boolean;
}) {
  const [state, action, pending] = useActionState(joinWithInvite, null);
  const subtitle = invalid
    ? "That code isn’t valid. Check it and try again."
    : siteName
      ? `Create a password to view ${siteName}${siteDomain ? ` (${siteDomain})` : ""}.`
      : "Paste your invite code, then create a password.";

  return (
    <AuthCard title="Create your password" subtitle={subtitle}>
      <form action={action} className="space-y-4">
        <label className="block text-[15px] text-ink">
          <span className="inline-flex items-center">
            Invite code
            <FieldHint label="Where to get an invite code">
              The owner shares a JN-XXXX-XXXX code, or sends you an email with a Create password button. Codes last 72 hours and work once.
            </FieldHint>
          </span>
          <input
            name="code"
            required
            autoComplete="off"
            spellCheck={false}
            defaultValue={code || ""}
            placeholder="JN-AB3K-9MP2"
            className={authInputClass}
          />
        </label>
        <label className="block text-[15px] text-ink">
          Email
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            defaultValue={email || ""}
            className={authInputClass}
          />
        </label>
        <label className="block text-[15px] text-ink">
          Password
          <input
            type="password"
            name="password"
            required
            minLength={8}
            autoComplete="new-password"
            className={authInputClass}
          />
        </label>
        <label className="block text-[15px] text-ink">
          Confirm password
          <input
            type="password"
            name="confirm"
            required
            minLength={8}
            autoComplete="new-password"
            className={authInputClass}
          />
        </label>
        {state?.error ? <p className="text-sm text-deep">{state.error}</p> : null}
        {invalid && !state?.error ? (
          <p className="text-sm text-deep">This invite is invalid or expired.</p>
        ) : null}
        <button type="submit" disabled={pending} className="btn w-full">
          {pending ? "Creating account…" : "Create password"}
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Already joined?{" "}
        <Link href="/login" className="text-ink underline decoration-pink underline-offset-4">
          Sign in
        </Link>
      </p>
    </AuthCard>
  );
}
