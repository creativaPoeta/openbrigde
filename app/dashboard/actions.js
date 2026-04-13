import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCurrentUser } from "@/lib/auth/session";
import { createShortLink, updateShortLink, updateShortLinkStatus } from "@/lib/links/repository";

export async function createShortLinkAction(formData) {
  "use server";
  const user = await requireCurrentUser("/dashboard");

  const result = await createShortLink({
    sourceUrl: formData.get("sourceUrl"),
    campaign: formData.get("campaign"),
  }, user.id);

  revalidatePath("/dashboard");

  if (result.error) {
    redirect(`/dashboard?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/dashboard/links/${result.data.slug}?status=created`);
}

export async function updateShortLinkAction(formData) {
  "use server";

  const user = await requireCurrentUser("/dashboard");
  const slug = String(formData.get("slug") || "").trim();
  const result = await updateShortLink(slug, {
    sourceUrl: formData.get("sourceUrl"),
    title: formData.get("title"),
    description: formData.get("description"),
    campaign: formData.get("campaign"),
    ctaLabel: formData.get("ctaLabel"),
  }, user.id);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/links/${slug}`);
  revalidatePath(`/go/${slug}`);
  revalidatePath(`/preview/${slug}`);

  if (result.error) {
    redirect(`/dashboard/links/${slug}?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/dashboard/links/${slug}?status=updated`);
}

export async function toggleShortLinkStatusAction(formData) {
  "use server";

  const user = await requireCurrentUser("/dashboard");
  const slug = String(formData.get("slug") || "").trim();
  const nextState = String(formData.get("nextState") || "").trim() === "active";
  const returnTo = String(formData.get("returnTo") || "").trim() || `/dashboard/links/${slug}`;

  const result = await updateShortLinkStatus(slug, nextState, user.id);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/links/${slug}`);
  revalidatePath(`/go/${slug}`);

  if (result.error) {
    redirect(`${returnTo}?error=${encodeURIComponent(result.error)}`);
  }

  const flash = nextState ? "activated" : "deactivated";
  redirect(`${returnTo}?status=${encodeURIComponent(flash)}`);
}
