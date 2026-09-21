"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthCard, authInputClass } from "@/components/AuthCard";
import { FieldHint } from "@/components/FieldHint";
import { sendMagicLink, signInWithPassword } from "./actions";

const errorCopy: Record<string, string> = {
  missing: "Enter your email and password.",
  invalid: "That email or password didn’t match. Invited clients create a password on Join.",
  send: "Could not send a sign-in link. Try again in a few minutes.",
  rate: "Too many emails were sent. Wait a few minutes and try again.",
};

export function LoginForm({ error }: { error?: string }) {
  const [mounted, setMounted] = useState(false);
  const [magic, setMagic] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <AuthCard
        title="Sign in"
        subtitle="Use the password you created when you joined."
      >
        <div className="h-48 rounded-lg bg-ink/5" aria-hidden="true" />
      </AuthCard>
    );
  }

  if (magic) {
    return (
      <AuthCard
        title="Email link"
        subtitle="We’ll email a one-time link. Use this if you haven’t set a password yet."
      >
        <form action={sendMagicLink} className="space-y-4">
          <label className="block text-[15px] text-ink" htmlFor="magic-email">
            Email
            <input
              id="magic-email"
              type="email"
              name="email"
              required
              autoComplete="email"
              className={authInputClass}
            />
          </label>
          {error ? (
            <p className="text-sm text-deep">{errorCopy[error] || errorCopy.send}</p>
          ) : null}
          <button type="submit" className="btn w-full">
            Send sign-in link
          </button>
          <button
            type="button"
            className="w-full text-sm text-muted hover:text-ink"
            onClick={() => setMagic(false)}
          >
            Back to password
          </button>
        </form>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Clients use the password they created from an invite."
    >
      <form action={signInWithPassword} className="space-y-4">
        <label className="block text-[15px] text-ink" htmlFor="login-email">
          Email
          <input
            id="login-email"
            type="email"
            name="email"
            required
            autoComplete="email"
            className={authInputClass}
            placeholder="you@jenafy.com"
          />
        </label>
        <label className="block text-[15px] text-ink" htmlFor="login-password">
          Password
          <input
            id="login-password"
            type="password"
            name="password"
            required
            autoComplete="current-password"
            minLength={8}
            className={authInputClass}
          />
        </label>
        {error ? (
          <p className="text-sm text-deep">{errorCopy[error] || errorCopy.invalid}</p>
        ) : null}
        <button type="submit" className="btn w-full">
          Sign in
        </button>
      </form>
      <p className="mt-6 text-sm text-muted">
        Have an invite code?{" "}
        <Link href="/join" className="text-ink underline decoration-pink underline-offset-4">
          Create a password
        </Link>
      </p>
      <div className="mt-3 flex items-center gap-1 text-sm text-muted">
        <button type="button" className="hover:text-ink" onClick={() => setMagic(true)}>
          Use an email sign-in link instead
        </button>
        <FieldHint label="When to use an email link">
          For the owner account that was created before passwords. Clients should create a password from an invite instead.
        </FieldHint>
      </div>
    </AuthCard>
  );
}
