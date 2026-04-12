export function getAppUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (explicitUrl) {
    return explicitUrl;
  }

  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  if (vercelProductionUrl) {
    return `https://${vercelProductionUrl}`;
  }

  const vercelPreviewUrl = process.env.VERCEL_URL;
  if (vercelPreviewUrl) {
    return `https://${vercelPreviewUrl}`;
  }

  return "http://localhost:3000";
}

export function buildPublicUrl(pathname) {
  return new URL(pathname, getAppUrl()).toString();
}

export function getRequestOrigin(headerList) {
  const forwardedProto = headerList?.get("x-forwarded-proto");
  const forwardedHost = headerList?.get("x-forwarded-host");
  const host = forwardedHost || headerList?.get("host");

  if (!host) {
    return getAppUrl();
  }

  const proto = forwardedProto || (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");
  return `${proto}://${host}`;
}

export function buildRequestUrl(pathname, headerList) {
  return new URL(pathname, getRequestOrigin(headerList)).toString();
}
