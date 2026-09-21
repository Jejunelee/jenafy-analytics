import { headers } from "next/headers";
import { appUrl } from "@/lib/env";

export async function requestOrigin() {
  const h = await headers();
  const host = (h.get("x-forwarded-host") || h.get("host") || "")
    .split(",")[0]
    .trim();
  if (!host) return appUrl();
  const proto =
    h.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}
