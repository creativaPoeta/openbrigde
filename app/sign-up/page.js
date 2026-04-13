import Link from "next/link";
import { redirect } from "next/navigation";
import { signupAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

function Flash({ error }) {
  if (!error) {
    return null;
  }

  return (
    <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
      {error}
    </div>
  );
}

export default async function SignupPage({ searchParams }) {
  const user = await getCurrentUser();
  const params = await searchParams;
  const nextCandidate = String(params.next || "/dashboard");
  const next =
    nextCandidate.startsWith("/") && !nextCandidate.startsWith("//") ? nextCandidate : "/dashboard";

  if (user) {
    redirect(next);
  }

  return (
    <main className="min-h-screen bg-[var(--paper)] px-6 py-12 text-[var(--ink)]">
      <section className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[2rem] border border-[var(--stroke)] bg-white/82 p-8 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--ink-muted)]">OpenBridge account</p>
          <h1 className="mt-5 text-4xl font-black sm:text-5xl">Create your workspace</h1>
          <p className="mt-4 text-base leading-8 text-[var(--ink-soft)]">
            Start with your own account so links, campaigns, and analytics belong to one owner from day one.
          </p>

          <div className="mt-6">
            <Flash error={params.error} />
          </div>

          <form action={signupAction} className="mt-6 grid gap-4">
            <input type="hidden" name="next" value={next} />

            <label className="grid gap-2 text-sm font-semibold">
              Email
              <input
                name="email"
                type="email"
                required
                className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              Password
              <input
                name="password"
                type="password"
                minLength={8}
                required
                className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
              />
            </label>

            <button
              type="submit"
              className="mt-2 rounded-full bg-[var(--signal)] px-6 py-3 font-semibold text-white transition hover:translate-y-[-1px]"
            >
              Create account
            </button>
          </form>

          <p className="mt-6 text-sm leading-7 text-[var(--ink-soft)]">
            Already have an account?{" "}
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="font-semibold text-[var(--ink)] underline">
              Sign in
            </Link>
          </p>
        </div>

        <aside className="rounded-[2rem] border border-[var(--stroke)] bg-[var(--sand)] p-8 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--ink-muted)]">Next product step</p>
          <div className="mt-5 grid gap-4 text-sm leading-7 text-[var(--ink-soft)]">
            <div className="rounded-[1.5rem] bg-white p-5">
              <p className="font-semibold text-[var(--ink)]">Owner-scoped dashboard</p>
              <p className="mt-2">Only your links and analytics will show once the ownership migration is applied.</p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-5">
              <p className="font-semibold text-[var(--ink)]">Ready for subscriptions</p>
              <p className="mt-2">This is the foundation for fixed plans, pay-as-you-go, quotas, and team access later.</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
