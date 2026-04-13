import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

const ALLOWED_EVENTS = new Set([
  "page_view",
  "auto_redirect",
  "auto_app_attempt",
  "open_primary_click",
  "handoff_hidden",
  "handoff_fallback",
  "copy_link",
  "continue_in_browser",
]);

function cleanText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function getGeoMeta(headers) {
  const geo = {
    country: cleanText(headers.get("x-vercel-ip-country"), 32),
    region: cleanText(headers.get("x-vercel-ip-country-region"), 80),
    city: cleanText(headers.get("x-vercel-ip-city"), 80),
    continent: cleanText(headers.get("x-vercel-ip-continent"), 32),
  };

  if (!geo.country && !geo.region && !geo.city && !geo.continent) {
    return null;
  }

  return geo;
}

export async function POST(req) {
  let body;

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid_json" }, { status: 400 });
  }

  const eventType = cleanText(body.eventType, 60);
  if (!ALLOWED_EVENTS.has(eventType)) {
    return NextResponse.json({ ok: false, error: "invalid_event" }, { status: 400 });
  }

  const client = getSupabaseAdminClient();
  if (!client) {
    return NextResponse.json({ ok: true, stored: false, reason: "missing_env" });
  }

  const incomingMeta = body.meta && typeof body.meta === "object" ? body.meta : {};
  const geo = getGeoMeta(req.headers);
  const eventMeta = geo ? { ...incomingMeta, geo } : incomingMeta;

  const { error } = await client.from("link_events").insert({
    link_id: cleanText(body.linkId, 80) || null,
    slug_snapshot: cleanText(body.slug, 120),
    event_type: eventType,
    destination_url: cleanText(body.destinationUrl, 500),
    page_url: cleanText(body.pageUrl, 500),
    referrer: cleanText(req.headers.get("referer"), 500),
    user_agent: cleanText(req.headers.get("user-agent"), 500),
    source_app: cleanText(body.sourceApp, 40),
    os: cleanText(body.os, 20),
    browser: cleanText(body.browser, 40),
    in_app: body.inApp === true,
    event_meta: eventMeta,
  });

  if (error) {
    return NextResponse.json({
      ok: true,
      stored: false,
      reason: error.code || error.message || "insert_failed",
    });
  }

  return NextResponse.json({ ok: true, stored: true });
}
