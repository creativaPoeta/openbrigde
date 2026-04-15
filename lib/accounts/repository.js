import {
  formatMonthlyEventLimit,
  getPlanDefinition,
  getUsagePercent,
  normalizePlanKey,
} from "@/lib/accounts/plans";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

function cleanText(value, max = 240) {
  return String(value || "").trim().replace(/\s+/g, " ").slice(0, max);
}

function normalizeEmail(value) {
  return cleanText(value, 320).toLowerCase();
}

function tableErrorMessage(error, fallback) {
  if (!error) return fallback;
  if (error.code === "42P01") return "The Supabase billing tables are missing. Run docs/SUPABASE.sql first.";
  return error.message || fallback;
}

function buildWorkspaceName(email) {
  const localPart = normalizeEmail(email).split("@")[0];
  if (!localPart) {
    return "OpenBridge workspace";
  }

  const title = localPart
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

  return `${title} workspace`;
}

function buildProfilePayload({ userId, email }) {
  const plan = getPlanDefinition("starter");

  return {
    user_id: userId,
    email: normalizeEmail(email) || null,
    workspace_name: buildWorkspaceName(email),
    plan_key: plan.key,
    monthly_event_limit: plan.monthlyEventLimit,
    billing_status: "trial",
  };
}

function normalizeProfileRow(row) {
  const plan = getPlanDefinition(row?.plan_key);
  const monthlyEventLimit =
    Number.isFinite(row?.monthly_event_limit) && row.monthly_event_limit >= 0
      ? Number(row.monthly_event_limit)
      : plan.monthlyEventLimit;

  return {
    userId: row?.user_id || "",
    email: normalizeEmail(row?.email),
    workspaceName: cleanText(row?.workspace_name, 160) || "OpenBridge workspace",
    planKey: plan.key,
    planLabel: plan.label,
    priceLabel: plan.priceLabel,
    planSummary: plan.summary,
    monthlyEventLimit,
    monthlyEventLimitLabel: formatMonthlyEventLimit(monthlyEventLimit),
    billingStatus: cleanText(row?.billing_status, 40) || "trial",
    createdAt: cleanText(row?.created_at, 80),
    updatedAt: cleanText(row?.updated_at, 80),
  };
}

function buildEmptyWorkspaceData() {
  const plan = getPlanDefinition("starter");

  return {
    profile: {
      userId: "",
      email: "",
      workspaceName: "OpenBridge workspace",
      planKey: plan.key,
      planLabel: plan.label,
      priceLabel: plan.priceLabel,
      planSummary: plan.summary,
      monthlyEventLimit: plan.monthlyEventLimit,
      monthlyEventLimitLabel: formatMonthlyEventLimit(plan.monthlyEventLimit),
      billingStatus: "trial",
      createdAt: "",
      updatedAt: "",
    },
    usage: {
      currentMonthLabel: "",
      currentMonthEvents: 0,
      currentMonthEventsLabel: "0",
      activeLinks: 0,
      activeLinksLabel: "0",
      remainingEvents: plan.monthlyEventLimit,
      remainingEventsLabel: formatMonthlyEventLimit(plan.monthlyEventLimit),
      usagePercent: 0,
      trackingEnabled: true,
      limitReached: false,
      trackingPolicy:
        "Links keep opening after the monthly cap, but extra tracking signals stop being stored until the next cycle.",
    },
  };
}

export function getBillingWindow(now = new Date()) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1, 0, 0, 0, 0));

  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    label: start.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
  };
}

async function readAccountProfile(client, userId) {
  const { data, error } = await client.from("account_profiles").select("*").eq("user_id", userId).maybeSingle();

  if (error) {
    return {
      data: null,
      error: tableErrorMessage(error, "Could not load the workspace profile."),
    };
  }

  return {
    data: data ? normalizeProfileRow(data) : null,
    error: "",
  };
}

export async function ensureAccountProfile({ userId, email = "" }) {
  const client = getSupabaseAdminClient();
  if (!client) {
    return {
      data: null,
      error: "Supabase env vars are missing. Fill .env.local first.",
    };
  }

  if (!userId) {
    return {
      data: null,
      error: "Authentication is required.",
    };
  }

  const existing = await readAccountProfile(client, userId);
  if (existing.error) {
    return existing;
  }

  if (existing.data) {
    const nextEmail = normalizeEmail(email);
    if (nextEmail && nextEmail !== existing.data.email) {
      const { data, error } = await client
        .from("account_profiles")
        .update({ email: nextEmail, updated_at: new Date().toISOString() })
        .eq("user_id", userId)
        .select("*")
        .single();

      if (error) {
        return {
          data: existing.data,
          error: tableErrorMessage(error, "Could not refresh the workspace profile."),
        };
      }

      return {
        data: normalizeProfileRow(data),
        error: "",
      };
    }

    return existing;
  }

  const payload = buildProfilePayload({ userId, email });
  const { data, error } = await client.from("account_profiles").insert(payload).select("*").single();

  if (error) {
    return {
      data: null,
      error: tableErrorMessage(error, "Could not create the workspace profile."),
    };
  }

  return {
    data: normalizeProfileRow(data),
    error: "",
  };
}

async function listOwnerLinkIds(client, userId) {
  const { data, error } = await client.from("short_links").select("id").eq("owner_id", userId);

  if (error) {
    return {
      data: [],
      error: tableErrorMessage(error, "Could not load owner links."),
    };
  }

  return {
    data: (data || []).map((row) => row.id).filter(Boolean),
    error: "",
  };
}

async function loadUsageSnapshot(client, userId, monthlyEventLimit) {
  const window = getBillingWindow();
  const linkIdsResult = await listOwnerLinkIds(client, userId);

  if (linkIdsResult.error) {
    return {
      data: buildEmptyWorkspaceData().usage,
      error: linkIdsResult.error,
    };
  }

  const linkIds = linkIdsResult.data;
  let eventCount = 0;
  let eventError = "";

  if (linkIds.length > 0) {
    const { count, error } = await client
      .from("link_events")
      .select("id", { count: "exact", head: true })
      .in("link_id", linkIds)
      .gte("created_at", window.startIso)
      .lt("created_at", window.endIso);

    if (error) {
      eventError = tableErrorMessage(error, "Could not load this month's usage.");
    } else {
      eventCount = count || 0;
    }
  }

  const remainingEvents =
    monthlyEventLimit === null ? null : Math.max((monthlyEventLimit || 0) - eventCount, 0);
  const usagePercent = getUsagePercent(eventCount, monthlyEventLimit);

  return {
    data: {
      currentMonthLabel: window.label,
      currentMonthEvents: eventCount,
      currentMonthEventsLabel: eventCount.toLocaleString("en-US"),
      activeLinks: linkIds.length,
      activeLinksLabel: linkIds.length.toLocaleString("en-US"),
      remainingEvents,
      remainingEventsLabel: formatMonthlyEventLimit(remainingEvents),
      usagePercent,
      trackingEnabled: monthlyEventLimit === null || eventCount < monthlyEventLimit,
      limitReached: monthlyEventLimit !== null && eventCount >= monthlyEventLimit,
      trackingPolicy:
        "Links keep opening after the monthly cap, but extra tracking signals stop being stored until the next cycle.",
    },
    error: eventError,
  };
}

export async function getAccountWorkspaceSnapshot({ userId, email = "" }) {
  const client = getSupabaseAdminClient();
  const fallback = buildEmptyWorkspaceData();

  if (!client) {
    return {
      data: fallback,
      error: "Supabase env vars are missing. Fill .env.local first.",
    };
  }

  if (!userId) {
    return {
      data: fallback,
      error: "Authentication is required.",
    };
  }

  const profileResult = await ensureAccountProfile({ userId, email });
  if (profileResult.error || !profileResult.data) {
    return {
      data: fallback,
      error: profileResult.error || "Could not load the workspace profile.",
    };
  }

  const usageResult = await loadUsageSnapshot(client, userId, profileResult.data.monthlyEventLimit);

  return {
    data: {
      profile: profileResult.data,
      usage: usageResult.data,
    },
    error: usageResult.error,
  };
}

export async function canStoreTrackedEvent(ownerId) {
  const client = getSupabaseAdminClient();
  const fallbackPlan = getPlanDefinition("starter");

  if (!ownerId) {
    return {
      allowed: true,
      planKey: fallbackPlan.key,
      monthlyEventLimit: fallbackPlan.monthlyEventLimit,
      currentMonthEvents: 0,
      reason: "missing_owner",
    };
  }

  if (!client) {
    return {
      allowed: true,
      planKey: fallbackPlan.key,
      monthlyEventLimit: fallbackPlan.monthlyEventLimit,
      currentMonthEvents: 0,
      reason: "missing_env",
    };
  }

  const profileResult = await readAccountProfile(client, ownerId);
  if (profileResult.error) {
    return {
      allowed: true,
      planKey: fallbackPlan.key,
      monthlyEventLimit: fallbackPlan.monthlyEventLimit,
      currentMonthEvents: 0,
      reason: "profile_unavailable",
    };
  }

  const profile = profileResult.data || normalizeProfileRow(buildProfilePayload({ userId: ownerId, email: "" }));
  const usageResult = await loadUsageSnapshot(client, ownerId, profile.monthlyEventLimit);
  if (usageResult.error) {
    return {
      allowed: true,
      planKey: profile.planKey,
      monthlyEventLimit: profile.monthlyEventLimit,
      currentMonthEvents: usageResult.data.currentMonthEvents,
      reason: "usage_unavailable",
    };
  }

  return {
    allowed: usageResult.data.trackingEnabled,
    planKey: normalizePlanKey(profile.planKey),
    monthlyEventLimit: profile.monthlyEventLimit,
    currentMonthEvents: usageResult.data.currentMonthEvents,
    reason: usageResult.data.limitReached ? "quota_reached" : "ok",
  };
}
