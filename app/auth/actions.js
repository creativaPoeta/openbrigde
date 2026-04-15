"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ensureAccountProfile } from "@/lib/accounts/repository";
import { buildPublicUrl } from "@/lib/site";
import { getSupabaseServerClient } from "@/lib/supabase/server";

function cleanText(value, max = 500) {
  return String(value || "").trim().slice(0, max);
}

function sanitizeNextPath(value) {
  const next = cleanText(value, 200);
  if (!next.startsWith("/") || next.startsWith("//")) {
    return "/dashboard";
  }

  return next;
}

export async function loginAction(formData) {
  const email = cleanText(formData.get("email"), 320).toLowerCase();
  const password = cleanText(formData.get("password"), 160);
  const next = sanitizeNextPath(formData.get("next"));
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  if (data?.user?.id) {
    await ensureAccountProfile({
      userId: data.user.id,
      email: data.user.email || email,
    });
  }

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signupAction(formData) {
  const email = cleanText(formData.get("email"), 320).toLowerCase();
  const password = cleanText(formData.get("password"), 160);
  const next = sanitizeNextPath(formData.get("next"));
  const supabase = await getSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: buildPublicUrl(`/auth/confirm?next=${encodeURIComponent(next)}`),
    },
  });

  if (error) {
    redirect(`/sign-up?error=${encodeURIComponent(error.message)}&next=${encodeURIComponent(next)}`);
  }

  if (data?.user?.id) {
    await ensureAccountProfile({
      userId: data.user.id,
      email: data.user.email || email,
    });
  }

  revalidatePath("/", "layout");

  if (data.session) {
    redirect(next);
  }

  redirect(`/login?message=${encodeURIComponent("Check your email to confirm your account.")}&next=${encodeURIComponent(next)}`);
}

export async function signoutAction() {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/");
}
