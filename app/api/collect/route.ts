import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { supabasePublishableKey, supabaseUrl } from "@/lib/env";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: cors });
}

function countryFrom(request: Request) {
  const h = request.headers;
  return (
    h.get("x-vercel-ip-country") ||
    h.get("cf-ipcountry") ||
    h.get("x-country-code") ||
    ""
  )
    .toUpperCase()
    .slice(0, 2);
}

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (!raw) {
      return NextResponse.json({ ok: false }, { status: 200, headers: cors });
    }
    const body = JSON.parse(raw) as {
      siteId?: unknown;
      visitorId?: unknown;
      sessionId?: unknown;
      events?: unknown;
    };
    const siteId = typeof body.siteId === "string" ? body.siteId.slice(0, 40) : "";
    const visitorId = typeof body.visitorId === "string" ? body.visitorId : "";
    const sessionId = typeof body.sessionId === "string" ? body.sessionId : "";
    if (!siteId || !visitorId || !UUID.test(sessionId) || !Array.isArray(body.events)) {
      return NextResponse.json({ ok: false }, { status: 200, headers: cors });
    }

    const supabase = createClient(supabaseUrl(), supabasePublishableKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data } = await supabase.rpc("ingest_analytics", {
      p_site_id: siteId,
      p_payload: {
        visitorId: visitorId.slice(0, 80),
        sessionId,
        events: body.events.slice(0, 60),
      },
      p_country: countryFrom(request) || null,
    });

    return NextResponse.json(data ?? { ok: true }, { headers: cors });
  } catch {
    return NextResponse.json({ ok: false }, { status: 200, headers: cors });
  }
}
