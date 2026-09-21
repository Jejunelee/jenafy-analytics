"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { normalizeInviteCode } from "@/lib/invite";

export type JoinState = {
  error?: string;
} | null;

type RpcResult = {
  ok?: boolean;
  error?: string;
  website_id?: string;
};

export async function joinWithInvite(
  _prev: JoinState,
  formData: FormData,
): Promise<JoinState> {
  const code = normalizeInviteCode(String(formData.get("code") || ""));
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") || "");
  const confirm = String(formData.get("confirm") || "");

  if (!code) return { error: "Enter the invite code." };
  if (!email) return { error: "Enter your email." };
  if (password.length < 8) return { error: "Use a password of at least 8 characters." };
  if (password !== confirm) return { error: "Those passwords don’t match." };

  const supabase = await createClient();
  const { data: peek } = await supabase.rpc("peek_invite_code", { p_code: code });
  if (!(peek as RpcResult | null)?.ok) {
    return { error: "That invite code is invalid or has expired." };
  }

  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });
  const already =
    !!signUpError && /already|registered|exists/i.test(signUpError.message);
  if (signUpError && !already) {
    return { error: signUpError.message };
  }

  const { data: prepared } = await supabase.rpc("prepare_invited_user", {
    p_code: code,
    p_email: email,
    p_password: password,
  });
  const prep = prepared as RpcResult | null;
  if (!prep?.ok) {
    const map: Record<string, string> = {
      invalid: "That invite code is invalid or has expired.",
      missing: "Could not create the account. Try again.",
      owner: "This email is the owner account. Sign in with an email link instead.",
      weak: "Use a password of at least 8 characters.",
    };
    return { error: map[prep?.error || ""] || "Could not finish joining." };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (signInError) {
    return { error: "Could not sign in with that password. Try the join form again." };
  }

  const { data: redeemed } = await supabase.rpc("redeem_invite_code", {
    p_code: code,
  });
  const result = redeemed as RpcResult | null;
  if (!result?.ok) {
    const map: Record<string, string> = {
      invalid: "That invite code is invalid.",
      used: "That invite code was already used.",
      expired: "That invite code has expired.",
    };
    return { error: map[result?.error || ""] || "Could not apply the invite." };
  }

  redirect(result.website_id ? `/sites/${result.website_id}` : "/sites");
}
