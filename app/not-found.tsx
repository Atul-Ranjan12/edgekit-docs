import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-6 py-32 text-center">
      <div className="font-mono text-5xl font-semibold text-accent">404</div>
      <h1 className="mt-4 text-xl font-semibold text-fg">Page not found</h1>
      <p className="mt-2 text-muted">That route didn&apos;t survive the gauntlet. Let&apos;s get you back on trend.</p>
      <div className="mt-6 flex gap-3">
        <Link href="/" className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition hover:opacity-90">
          Home
        </Link>
        <Link href="/docs" className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-fg transition hover:border-border-strong">
          Docs
        </Link>
      </div>
    </div>
  );
}
