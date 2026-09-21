"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser, requireWebsite } from "@/lib/auth";
import { sendInviteCodeEmail } from "@/lib/email";
import { normalizeDomain } from "@/lib/domain";
import {
  formatInviteCode,
  generateInviteCode,
  inviteExpiryIso,
  joinPath,
} from "@/lib/invite";
import { requestOrigin } from "@/lib/origin";

export async function createWebsite(formData: FormData) {
  const { supabase, profile } = await requireUser();
  if (profile.global_role !== "owner") redirect("/sites/new?error=owner");

  const name = String(formData.get("name") || "").trim();
  const domain = normalizeDomain(String(formData.get("domain") || ""));
  if (!name || !domain) redirect("/sites/new?error=missing");

  const { data, error } = await supabase
    .from("websites")
    .insert({ name, domain, created_by: profile.id })
    .select("id")
    .single();

  if (error || !data) {
    const code = error?.code === "23505" ? "duplicate" : "create";
    redirect(`/sites/new?error=${code}`);
  }
  redirect(`/sites/${data.id}/install`);
}

export async function updateWebsite(formData: FormData) {
  const id = String(formData.get("id") || "");
  const { supabase, profile } = await requireWebsite(id);
  if (profile.global_role !== "owner") redirect(`/sites/${id}`);

  const name = String(formData.get("name") || "").trim();
  const domain = normalizeDomain(String(formData.get("domain") || ""));
  if (!name || !domain) redirect(`/sites/${id}/settings`);
  await supabase
    .from("websites")
    .update({ name, domain, updated_at: new Date().toISOString() })
    .eq("id", id);
  redirect(`/sites/${id}/settings`);
}

export async function deleteWebsite(formData: FormData) {
  const id = String(formData.get("id") || "");
  const { supabase, profile } = await requireWebsite(id);
  if (profile.global_role !== "owner") redirect(`/sites/${id}`);
  await supabase.from("websites").delete().eq("id", id);
  redirect("/sites");
}

export type InviteActionState = {
  error?: string;
  emailSent?: boolean;
  emailError?: string;
  code?: string;
  joinUrl?: string;
  expiresAt?: string;
} | null;

async function createInviteCodeRow(
  supabase: Awaited<ReturnType<typeof requireWebsite>>["supabase"],
  websiteId: string,
  createdBy: string,
  email: string | null,
) {
  const expiresAt = inviteExpiryIso();
  for (let i = 0; i < 5; i++) {
    const code = generateInviteCode();
    const { error } = await supabase.from("invite_codes").insert({
      website_id: websiteId,
      code,
      email,
      expires_at: expiresAt,
      created_by: createdBy,
    });
    if (!error) {
      return { code: formatInviteCode(code), expiresAt };
    }
    if (error.code !== "23505") {
      return { error: "Could not create an invite code." };
    }
  }
  return { error: "Could not create an invite code." };
}

export async function createInvite(
  _prev: InviteActionState,
  formData: FormData,
): Promise<InviteActionState> {
  const id = String(formData.get("id") || "");
  const email = String(formData.get("email") || "")
    .trim()
    .toLowerCase();
  const { supabase, profile, website } = await requireWebsite(id);
  if (profile.global_role !== "owner") {
    return { error: "Only the owner can invite clients." };
  }

  const minted = await createInviteCodeRow(
    supabase,
    id,
    profile.id,
    email || null,
  );
  if ("error" in minted) return { error: minted.error };

  const origin = await requestOrigin();
  const joinUrl = `${origin}${joinPath(minted.code, email || undefined)}`;

  let emailSent = false;
  let emailError: string | undefined;
  if (email) {
    const sent = await sendInviteCodeEmail({
      to: email,
      siteName: website.name,
      siteDomain: website.domain,
      code: minted.code,
      expiresAt: minted.expiresAt,
      joinUrl,
    });
    emailSent = sent.ok;
    emailError = sent.ok ? undefined : sent.error;
  }

  revalidatePath(`/sites/${id}/team`);
  return {
    emailSent,
    emailError,
    code: minted.code,
    joinUrl,
    expiresAt: minted.expiresAt,
  };
}

export async function revokeInviteCode(formData: FormData) {
  const id = String(formData.get("id") || "");
  const codeId = String(formData.get("code_id") || "");
  const { supabase, profile } = await requireWebsite(id);
  if (profile.global_role !== "owner") redirect(`/sites/${id}/team`);
  await supabase
    .from("invite_codes")
    .delete()
    .eq("id", codeId)
    .eq("website_id", id)
    .is("redeemed_at", null);
  redirect(`/sites/${id}/team`);
}

export async function removeMember(formData: FormData) {
  const id = String(formData.get("id") || "");
  const userId = String(formData.get("user_id") || "");
  const { supabase, profile } = await requireWebsite(id);
  if (profile.global_role !== "owner") redirect(`/sites/${id}/team`);
  await supabase
    .from("website_members")
    .delete()
    .eq("website_id", id)
    .eq("user_id", userId);
  redirect(`/sites/${id}/team`);
}
