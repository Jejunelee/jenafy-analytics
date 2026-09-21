import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  email: string;
  global_role: "owner" | "client";
};

export type Website = {
  id: string;
  public_id: string;
  name: string;
  domain: string;
  created_at: string;
};

export const requireUser = cache(async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const sub = claims?.sub as string | undefined;
  if (!sub) redirect("/login");

  const email = String(claims?.email || "").toLowerCase();

  let { data: profile } = await supabase
    .from("profiles")
    .select("id, email, global_role")
    .eq("id", sub)
    .maybeSingle();

  if (!profile) {
    await supabase.from("profiles").upsert(
      { id: sub, email },
      { onConflict: "id", ignoreDuplicates: true },
    );
    const retry = await supabase
      .from("profiles")
      .select("id, email, global_role")
      .eq("id", sub)
      .maybeSingle();
    profile = retry.data;
  }

  if (!profile) redirect("/login");
  return { supabase, profile: profile as Profile };
});

export const requireWebsite = cache(async (id: string) => {
  const ctx = await requireUser();
  const { data: website } = await ctx.supabase
    .from("websites")
    .select("id, public_id, name, domain, created_at")
    .eq("id", id)
    .single();
  if (!website) redirect("/sites");
  return { ...ctx, website: website as Website };
});
