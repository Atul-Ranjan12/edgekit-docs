import Link from "next/link";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <Link href="/" className={`group flex items-center gap-2.5 ${className}`}>
      <svg width="26" height="26" viewBox="0 0 32 32" fill="none" aria-hidden className="flex-none">
        <rect x="1" y="1" width="30" height="30" rx="8" className="fill-accent-soft stroke-accent" strokeWidth="1.5" />
        {/* an upward edge / equity curve */}
        <path
          d="M7 22 L13 16 L18 19 L25 9"
          className="stroke-accent"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="25" cy="9" r="2.4" className="fill-accent" />
      </svg>
      <span className="text-[15px] font-semibold tracking-tight text-fg">edgekit</span>
    </Link>
  );
}
