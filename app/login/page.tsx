import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { AuthCard } from "@/components/AuthCard";
import { createClient } from "@/lib/supabase/server";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const q = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  if (data?.claims) redirect("/sites");

  if (q.sent) {
    return (
      <AuthCard
        title="Check your email"
        subtitle="Open the sign-in link we just sent. Then you’re in the dashboard."
      >
        <p className="text-muted">If nothing arrives, wait a few minutes and try again.</p>
      </AuthCard>
    );
  }

  return <LoginForm error={q.error} />;
}
