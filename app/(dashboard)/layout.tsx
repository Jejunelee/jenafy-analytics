import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { supabase, profile } = await requireUser();
  const { data } = await supabase
    .from("websites")
    .select("id, name, domain")
    .order("created_at", { ascending: true });

  return (
    <AppShell profile={profile} websites={data || []}>
      {children}
    </AppShell>
  );
}
