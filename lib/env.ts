export function supabaseUrl() {
  return process.env.NEXT_PUBLIC_SUPABASE_URL!;
}

export function supabasePublishableKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

export function appUrl() {
  const raw = (process.env.NEXT_PUBLIC_APP_URL || "https://app.jenafy.com").trim();
  const trimmed = raw.replace(/\/$/, "");
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
