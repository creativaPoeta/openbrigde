import { findShortLinkBySlug } from "@/lib/links/repository";
import { resolveLinkPresentation } from "@/lib/links/presentation";

export const dynamic = "force-dynamic";

const YOUTUBE_THUMBNAIL_CANDIDATES = ["maxresdefault.jpg", "sddefault.jpg", "hqdefault.jpg"];

function buildCacheHeaders(contentType) {
  return {
    "content-type": contentType,
    "cache-control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800",
  };
}

function buildSvgFallback(title) {
  const safeTitle = String(title || "OpenBridge")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="1200" height="630" viewBox="0 0 1200 630" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1200" y2="630" gradientUnits="userSpaceOnUse">
      <stop stop-color="#182937"/>
      <stop offset="1" stop-color="#E16F2A"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="52" y="52" width="1096" height="526" rx="36" fill="white" fill-opacity="0.08"/>
  <text x="84" y="132" fill="#F3EEE7" font-family="Arial, sans-serif" font-size="30" letter-spacing="7">OPENBRIDGE</text>
  <text x="84" y="260" fill="white" font-family="Arial, sans-serif" font-size="68" font-weight="700">${safeTitle}</text>
  <text x="84" y="334" fill="#F6D1BC" font-family="Arial, sans-serif" font-size="32">Smart link preview fallback</text>
</svg>`;
}

async function fetchYouTubeThumbnail(videoId) {
  for (const filename of YOUTUBE_THUMBNAIL_CANDIDATES) {
    const response = await fetch(`https://i.ytimg.com/vi/${videoId}/${filename}`, {
      cache: "force-cache",
      headers: {
        "user-agent": "OpenBridgeBot/1.0",
      },
    });

    if (!response.ok) {
      continue;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const bytes = await response.arrayBuffer();

    if (!bytes.byteLength) {
      continue;
    }

    return new Response(bytes, {
      status: 200,
      headers: buildCacheHeaders(contentType),
    });
  }

  return null;
}

async function fetchRemoteImage(imageUrl) {
  try {
    const response = await fetch(imageUrl, {
      cache: "force-cache",
      headers: {
        "user-agent": "OpenBridgeBot/1.0",
      },
    });

    if (!response.ok) {
      return null;
    }

    const contentType = response.headers.get("content-type") || "";
    if (!contentType.startsWith("image/")) {
      return null;
    }

    const bytes = await response.arrayBuffer();
    if (!bytes.byteLength) {
      return null;
    }

    return new Response(bytes, {
      status: 200,
      headers: buildCacheHeaders(contentType),
    });
  } catch {
    return null;
  }
}

export async function GET(_req, { params }) {
  const { slug } = await params;
  const result = await findShortLinkBySlug(slug);

  if (!result.data) {
    return new Response("Not found", { status: 404 });
  }

  if (result.data.destinationType === "youtube_video") {
    const thumbnailResponse = await fetchYouTubeThumbnail(result.data.destinationValue);
    if (thumbnailResponse) {
      return thumbnailResponse;
    }
  }

  const presentation = await resolveLinkPresentation(result.data);
  if (presentation.imageUrl) {
    const imageResponse = await fetchRemoteImage(presentation.imageUrl);
    if (imageResponse) {
      return imageResponse;
    }
  }

  return new Response(buildSvgFallback(presentation?.activeTitle || result.data.title), {
    status: 200,
    headers: buildCacheHeaders("image/svg+xml"),
  });
}
