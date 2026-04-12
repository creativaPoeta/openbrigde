import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createShortLink, updateShortLinkStatus } from "@/lib/links/repository";

export async function createShortLinkAction(formData) {
  "use server";

  const result = await createShortLink({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    campaign: formData.get("campaign"),
    destinationType: formData.get("destinationType"),
    destinationValue: formData.get("destinationValue"),
    ctaLabel: formData.get("ctaLabel"),
  });

  revalidatePath("/dashboard");

  if (result.error) {
    redirect(`/dashboard?error=${encodeURIComponent(result.error)}`);
  }

  redirect(`/dashboard?created=${encodeURIComponent(result.data.slug)}`);
}

export async function toggleShortLinkStatusAction(formData) {
  "use server";

  const slug = String(formData.get("slug") || "").trim();
  const nextState = String(formData.get("nextState") || "").trim() === "active";
  const returnTo = String(formData.get("returnTo") || "").trim() || `/dashboard/links/${slug}`;

  const result = await updateShortLinkStatus(slug, nextState);

  revalidatePath("/dashboard");
  revalidatePath(`/dashboard/links/${slug}`);
  revalidatePath(`/go/${slug}`);

  if (result.error) {
    redirect(`${returnTo}?error=${encodeURIComponent(result.error)}`);
  }

  const flash = nextState ? "activated" : "deactivated";
  redirect(`${returnTo}?status=${encodeURIComponent(flash)}`);
}
