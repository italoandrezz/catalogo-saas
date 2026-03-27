import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_20%_20%,#fde68a,transparent_35%),radial-gradient(circle_at_80%_80%,#a5f3fc,transparent_30%),#f8fafc] p-6">
      <section className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white/90 p-10 shadow-xl backdrop-blur">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-500">Catalog SaaS</p>
        <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight text-slate-900 sm:text-5xl">
          Build and manage your product catalog in one place.
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          Clean API, structured dashboard and scalable architecture to run your business catalog.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/register"
            className="rounded-lg bg-slate-900 px-5 py-3 text-center text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-slate-300 bg-white px-5 py-3 text-center text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}
