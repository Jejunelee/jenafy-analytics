import { redirect } from "next/navigation";
import { JoinForm } from "./join-form";
import { createClient } from "@/lib/supabase/server";
import { formatInviteCode, normalizeInviteCode } from "@/lib/invite";

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string; email?: string }>;
}) {
  const q = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/sites");

  const raw = q.code ? normalizeInviteCode(q.code) : "";
  let siteName: string | undefined;
  let siteDomain: string | undefined;
  let invalid = false;

  if (raw) {
    const { data: peek } = await supabase.rpc("peek_invite_code", { p_code: raw });
    const result = peek as {
      ok?: boolean;
      site_name?: string;
      site_domain?: string;
    } | null;
    if (result?.ok) {
      siteName = result.site_name;
      siteDomain = result.site_domain;
    } else {
      invalid = true;
    }
  }

  return (
    <JoinForm
      code={raw ? formatInviteCode(raw) : ""}
      email={q.email}
      siteName={siteName}
      siteDomain={siteDomain}
      invalid={invalid}
    />
  );
}
