const PLAN_CATALOG = {
  starter: {
    key: "starter",
    label: "Starter",
    priceLabel: "EUR 0 / month",
    monthlyEventLimit: 1000,
    summary: "A lightweight plan for validating channels, campaigns, and early traffic.",
  },
  growth: {
    key: "growth",
    label: "Growth",
    priceLabel: "EUR 29 / month",
    monthlyEventLimit: 25000,
    summary: "For active creators and teams that need a solid monthly tracking envelope.",
  },
  scale: {
    key: "scale",
    label: "Scale",
    priceLabel: "Custom",
    monthlyEventLimit: null,
    summary: "For high-volume routing, advanced support, and custom commercial terms.",
  },
};

export function getPlanCatalog() {
  return Object.values(PLAN_CATALOG);
}

export function normalizePlanKey(value) {
  const key = String(value || "").trim().toLowerCase();
  return PLAN_CATALOG[key] ? key : "starter";
}

export function getPlanDefinition(planKey) {
  return PLAN_CATALOG[normalizePlanKey(planKey)];
}

export function formatMonthlyEventLimit(limit) {
  if (limit === null || limit === undefined) {
    return "Unlimited";
  }

  return Number(limit).toLocaleString("en-US");
}

export function getUsagePercent(currentValue, limit) {
  if (limit === null || limit === undefined) {
    return null;
  }

  const safeLimit = Math.max(Number(limit) || 0, 0);
  if (safeLimit === 0) {
    return 100;
  }

  const safeCurrent = Math.max(Number(currentValue) || 0, 0);
  return Math.min(100, Math.round((safeCurrent / safeLimit) * 100));
}
