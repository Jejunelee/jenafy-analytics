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
  return process.env.NEXT_PUBLIC_APP_URL || "https://stats.jenafy.com";
}
