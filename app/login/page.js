import Link from "next/link";
import { redirect } from "next/navigation";
import { loginAction } from "@/app/auth/actions";
import { getCurrentUser } from "@/lib/auth/session";

function Flash({ error, message }) {
  if (error) {
    return (
      <div className="rounded-[1.5rem] border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-800">
        {error}
      </div>
    );
  }

  if (message) {
    return (
      <div className="rounded-[1.5rem] border border-green-200 bg-green-50 px-5 py-4 text-sm text-green-800">
        {message}
      </div>
    );
  }

  return null;
}

export default async function LoginPage({ searchParams }) {
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
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--ink-muted)]">OpenBridge access</p>
          <h1 className="mt-5 text-4xl font-black sm:text-5xl">Sign in to your workspace</h1>
          <p className="mt-4 text-base leading-8 text-[var(--ink-soft)]">
            Your dashboard, links, exports, and analytics now belong to your own account.
          </p>

          <div className="mt-6">
            <Flash error={params.error} message={params.message} />
          </div>

          <form action={loginAction} className="mt-6 grid gap-4">
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
                required
                className="rounded-2xl border border-[var(--stroke)] bg-[var(--paper)] px-4 py-3 font-normal outline-none"
              />
            </label>

            <button
              type="submit"
              className="mt-2 rounded-full bg-[var(--signal)] px-6 py-3 font-semibold text-white transition hover:translate-y-[-1px]"
            >
              Sign in
            </button>
          </form>

          <p className="mt-6 text-sm leading-7 text-[var(--ink-soft)]">
            No account yet?{" "}
            <Link href={`/sign-up?next=${encodeURIComponent(next)}`} className="font-semibold text-[var(--ink)] underline">
              Create one
            </Link>
          </p>
        </div>

        <aside className="rounded-[2rem] border border-[var(--stroke)] bg-[var(--sand)] p-8 shadow-[0_25px_80px_rgba(29,43,59,0.08)]">
          <p className="text-xs uppercase tracking-[0.35em] text-[var(--ink-muted)]">Why auth now</p>
          <div className="mt-5 grid gap-4 text-sm leading-7 text-[var(--ink-soft)]">
            <div className="rounded-[1.5rem] bg-white p-5">
              <p className="font-semibold text-[var(--ink)]">Separate customer data</p>
              <p className="mt-2">Each account gets its own links, events, campaigns, exports, and future billing scope.</p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-5">
              <p className="font-semibold text-[var(--ink)]">Prepare billing and quotas</p>
              <p className="mt-2">Usage becomes attributable to an owner, which is the prerequisite for plans and invoicing.</p>
            </div>
            <div className="rounded-[1.5rem] bg-white p-5">
              <p className="font-semibold text-[var(--ink)]">Keep public handoff links public</p>
              <p className="mt-2">Only the workspace is protected. Shared `/go/...` links still stay accessible for end users.</p>
            </div>
          </div>
        </aside>
      </section>
    </main>
  );
}
