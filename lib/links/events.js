function cleanText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function formatCountryLabel(value) {
  const country = cleanText(value).toUpperCase();
  if (!country) {
    return "";
  }

  if (/^[A-Z]{2}$/.test(country)) {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(country) || country;
    } catch {
      return country;
    }
  }

  return country;
}

export function getEventGeo(meta) {
  if (!meta || typeof meta !== "object") {
    return null;
  }

  const geo = meta.geo;
  if (!geo || typeof geo !== "object") {
    return null;
  }

  const normalized = {
    city: cleanText(geo.city),
    region: cleanText(geo.region),
    country: cleanText(geo.country),
    continent: cleanText(geo.continent),
  };

  if (!normalized.city && !normalized.region && !normalized.country && !normalized.continent) {
    return null;
  }

  return normalized;
}

export function formatEventGeo(meta) {
  const geo = getEventGeo(meta);
  if (!geo) {
    return "Unknown region";
  }

  const parts = [geo.city, geo.region, formatCountryLabel(geo.country)].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(", ");
  }

  return geo.continent || "Unknown region";
}
