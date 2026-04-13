import { getDestinationOption } from "@/lib/links/catalog";

function normalizeText(value, fallback = "", max = 240) {
  const text = String(value || "").trim().replace(/\s+/g, " ");
  return text ? text.slice(0, max) : fallback;
}

function normalizePotentialUrlInput(value, max = 1200) {
  const input = normalizeText(value, "", max);
  if (!input) {
    return "";
  }

  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(input)) {
    return input;
  }

  if (/^(www\.)?[a-z0-9-]+\.[a-z]{2,}/i.test(input)) {
    return `https://${input}`;
  }

  return input;
}

function normalizeUrl(value) {
  const input = normalizePotentialUrlInput(value, 1200);
  if (!input) {
    throw new Error("Destination URL is required.");
  }

  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Destination URL must be a valid absolute URL.");
  }

  const isLocalhost = ["localhost", "127.0.0.1"].includes(url.hostname);
  if (!["https:", "http:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  if (url.protocol === "http:" && !isLocalhost) {
    throw new Error("Only localhost URLs may use http.");
  }

  return url.toString();
}

export function inferDestinationTypeFromValue(value) {
  const input = normalizePotentialUrlInput(value, 1200);
  if (!input) {
    throw new Error("A full destination URL is required.");
  }

  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("Enter a valid full destination URL.");
  }

  const host = url.hostname.toLowerCase();

  if (host.includes("youtu.be") || host.includes("youtube.com")) {
    return "youtube_video";
  }

  if (host.includes("instagram.com")) {
    return "instagram_profile";
  }

  if (host.includes("tiktok.com")) {
    return "tiktok_profile";
  }

  if (host.includes("wa.me") || host.includes("api.whatsapp.com")) {
    return "whatsapp_chat";
  }

  if (host.includes("t.me") || host.includes("telegram.me")) {
    return "telegram_profile";
  }

  if (host.includes("apps.apple.com")) {
    return "app_store_app";
  }

  if (host.includes("play.google.com")) {
    return "play_store_app";
  }

  return "web";
}

function buildChromeIntent(webUrl) {
  const url = new URL(webUrl);
  return `intent://${url.host}${url.pathname}${url.search}${url.hash}#Intent;scheme=${url.protocol.replace(":", "")};package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`;
}

function withDefaults(type, payload) {
  const option = getDestinationOption(type);

  return {
    destinationType: type,
    destinationLabel: option?.label || type,
    ...payload,
    chromeIntentUrl: payload.chromeIntentUrl ?? buildChromeIntent(payload.webUrl),
    ctaLabel: normalizeText(payload.ctaLabel, option?.defaultCta || "Open destination", 50),
  };
}

function normalizeHandle(value, { prefix = "", hosts = [], pattern, errorMessage }) {
  const input = normalizePotentialUrlInput(value, 400);
  if (!input) {
    throw new Error(errorMessage);
  }

  let candidate = input;

  try {
      const url = new URL(input);
    if (!hosts.some((host) => url.hostname.includes(host))) {
      throw new Error(errorMessage);
    }

    const parts = url.pathname.split("/").filter(Boolean);
    candidate = parts[0] || "";
    if (prefix && candidate === prefix.replace("/", "")) {
      candidate = parts[1] || "";
    }
  } catch {
    candidate = input;
  }

  candidate = candidate.replace(/^@/, "").replace(/^\/+/, "").replace(/\/+$/, "");
  if (prefix) {
    candidate = candidate.replace(new RegExp(`^${prefix}`), "");
  }

  if (!pattern.test(candidate)) {
    throw new Error(errorMessage);
  }

  return candidate;
}

function extractYouTubeId(value) {
  const input = normalizePotentialUrlInput(value, 400);
  if (!input) {
    throw new Error("A YouTube video ID or URL is required.");
  }

  const basicId = /^[a-zA-Z0-9_-]{11}$/;
  if (basicId.test(input)) return input;

  let url;
  try {
    url = new URL(input);
  } catch {
    throw new Error("The YouTube value must be a video ID or a full URL.");
  }

  if (url.hostname.includes("youtu.be")) {
    const id = url.pathname.replace("/", "").trim();
    if (basicId.test(id)) return id;
  }

  if (url.hostname.includes("youtube.com")) {
    const v = url.searchParams.get("v") || "";
    if (basicId.test(v)) return v;

    const parts = url.pathname.split("/").filter(Boolean);
    const embedIndex = parts.findIndex((part) => part === "embed" || part === "shorts");
    if (embedIndex !== -1 && parts[embedIndex + 1] && basicId.test(parts[embedIndex + 1])) {
      return parts[embedIndex + 1];
    }
  }

  throw new Error("Could not extract a valid YouTube video ID.");
}

function normalizeInstagramProfile(value, ctaLabel) {
  const handle = normalizeHandle(value, {
    hosts: ["instagram.com"],
    pattern: /^[a-zA-Z0-9._]{1,30}$/,
    errorMessage: "Use an Instagram handle like @creator or a full Instagram profile URL.",
  });
  const webUrl = `https://www.instagram.com/${handle}/`;

  return withDefaults("instagram_profile", {
    destinationValue: handle,
    webUrl,
    fallbackUrl: webUrl,
    ctaLabel,
    summary: `Instagram @${handle}`,
  });
}

function normalizeTikTokProfile(value, ctaLabel) {
  const handle = normalizeHandle(value, {
    prefix: "@",
    hosts: ["tiktok.com"],
    pattern: /^[a-zA-Z0-9._]{2,30}$/,
    errorMessage: "Use a TikTok handle like @creator or a full TikTok profile URL.",
  });
  const webUrl = `https://www.tiktok.com/@${handle}`;

  return withDefaults("tiktok_profile", {
    destinationValue: handle,
    webUrl,
    fallbackUrl: webUrl,
    ctaLabel,
    summary: `TikTok @${handle}`,
  });
}

function normalizeWhatsAppChat(value, ctaLabel) {
  const input = normalizePotentialUrlInput(value, 800);
  if (!input) {
    throw new Error("Use a phone number, a wa.me URL, or phone|message for WhatsApp.");
  }

  let phone = "";
  let message = "";

  try {
    const url = new URL(input);
    if (url.hostname.includes("wa.me")) {
      phone = url.pathname.replace(/\//g, "");
      message = url.searchParams.get("text") || "";
    } else if (url.hostname.includes("api.whatsapp.com")) {
      phone = url.searchParams.get("phone") || "";
      message = url.searchParams.get("text") || "";
    } else {
      throw new Error("Use a phone number, a wa.me URL, or phone|message for WhatsApp.");
    }
  } catch {
    const [rawPhone, rawMessage = ""] = input.split("|", 2);
    phone = rawPhone;
    message = rawMessage;
  }

  const normalizedPhone = phone.replace(/\D/g, "");
  if (!normalizedPhone) {
    throw new Error("WhatsApp needs a valid phone number.");
  }

  const text = normalizeText(message, "", 500);
  const webUrl = `https://wa.me/${normalizedPhone}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  const destinationValue = text ? `${normalizedPhone}|${text}` : normalizedPhone;

  return withDefaults("whatsapp_chat", {
    destinationValue,
    webUrl,
    fallbackUrl: webUrl,
    ctaLabel,
    summary: `WhatsApp ${normalizedPhone}`,
  });
}

function normalizeTelegramProfile(value, ctaLabel) {
  const handle = normalizeHandle(value, {
    hosts: ["t.me", "telegram.me"],
    pattern: /^[a-zA-Z0-9_]{5,32}$/,
    errorMessage: "Use a Telegram handle like @channelname or a full t.me URL.",
  });
  const webUrl = `https://t.me/${handle}`;

  return withDefaults("telegram_profile", {
    destinationValue: handle,
    webUrl,
    fallbackUrl: webUrl,
    ctaLabel,
    summary: `Telegram ${handle}`,
  });
}

function normalizeAppStoreApp(value, ctaLabel) {
  const input = normalizePotentialUrlInput(value, 800);
  if (!input) {
    throw new Error("Use an App Store ID like id1234567890 or a full App Store URL.");
  }

  let appId = "";

  try {
    const url = new URL(input);
    if (!url.hostname.includes("apps.apple.com")) {
      throw new Error("Use an App Store ID like id1234567890 or a full App Store URL.");
    }

    const match = url.pathname.match(/id(\d+)/);
    appId = match?.[1] || "";
  } catch {
    appId = input.replace(/^id/i, "").replace(/\D/g, "");
  }

  if (!appId) {
    throw new Error("Could not extract a valid App Store app ID.");
  }

  const webUrl = `https://apps.apple.com/app/id${appId}`;

  return withDefaults("app_store_app", {
    destinationValue: `id${appId}`,
    webUrl,
    fallbackUrl: webUrl,
    ctaLabel,
    summary: `App Store id${appId}`,
  });
}

function normalizePlayStoreApp(value, ctaLabel) {
  const input = normalizePotentialUrlInput(value, 800);
  if (!input) {
    throw new Error("Use a Play Store package name like com.example.app or a full Play Store URL.");
  }

  let packageName = "";

  try {
    const url = new URL(input);
    if (!url.hostname.includes("play.google.com")) {
      throw new Error("Use a Play Store package name like com.example.app or a full Play Store URL.");
    }

    packageName = url.searchParams.get("id") || "";
  } catch {
    packageName = input;
  }

  const normalizedPackage = packageName.trim();
  if (!/^[a-zA-Z0-9._]+$/.test(normalizedPackage) || !normalizedPackage.includes(".")) {
    throw new Error("Could not extract a valid Play Store package name.");
  }

  const webUrl = `https://play.google.com/store/apps/details?id=${encodeURIComponent(normalizedPackage)}`;

  return withDefaults("play_store_app", {
    destinationValue: normalizedPackage,
    webUrl,
    fallbackUrl: webUrl,
    ctaLabel,
    summary: `Play Store ${normalizedPackage}`,
  });
}

export function normalizeDestination({ destinationType, destinationValue, ctaLabel }) {
  const normalizedType = normalizeText(destinationType, "", 40);
  const type = normalizedType || inferDestinationTypeFromValue(destinationValue);

  if (type === "youtube_video") {
    const videoId = extractYouTubeId(destinationValue);
    const webUrl = `https://www.youtube.com/watch?v=${videoId}`;

    return withDefaults(type, {
      destinationValue: videoId,
      webUrl,
      fallbackUrl: webUrl,
      androidIntentUrl: `intent://www.youtube.com/watch?v=${videoId}#Intent;scheme=https;package=com.google.android.youtube;S.browser_fallback_url=${encodeURIComponent(webUrl)};end`,
      ctaLabel,
      summary: `YouTube video ${videoId}`,
    });
  }

  if (type === "web") {
    const webUrl = normalizeUrl(destinationValue);

    return withDefaults(type, {
      destinationValue: webUrl,
      webUrl,
      fallbackUrl: webUrl,
      androidIntentUrl: "",
      ctaLabel,
      summary: webUrl,
    });
  }

  if (type === "instagram_profile") {
    return normalizeInstagramProfile(destinationValue, ctaLabel);
  }

  if (type === "tiktok_profile") {
    return normalizeTikTokProfile(destinationValue, ctaLabel);
  }

  if (type === "whatsapp_chat") {
    return normalizeWhatsAppChat(destinationValue, ctaLabel);
  }

  if (type === "telegram_profile") {
    return normalizeTelegramProfile(destinationValue, ctaLabel);
  }

  if (type === "app_store_app") {
    return normalizeAppStoreApp(destinationValue, ctaLabel);
  }

  if (type === "play_store_app") {
    return normalizePlayStoreApp(destinationValue, ctaLabel);
  }

  throw new Error("Unsupported destination type.");
}
