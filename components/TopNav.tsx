"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/triage", label: "Triage" },
  { href: "/dashboard", label: "Provider Dashboard" },
  { href: "/simulation", label: "Simulation" },
];

export function TopNav() {
  const pathname = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-hairline bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 md:px-6">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-sm">
            <PulseIcon />
          </span>
          <span className="text-lg font-semibold tracking-tight text-ink">
            Pulse<span className="text-brand-600">Path</span>
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = pathname === l.href || pathname.startsWith(l.href + "/");
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`hidden rounded-lg px-3 py-2 text-sm font-medium transition sm:block ${
                  active ? "bg-brand-50 text-brand-700" : "text-muted hover:bg-slate-50 hover:text-ink"
                }`}
              >
                {l.label}
              </Link>
            );
          })}
          <Link href="/triage" className="btn-primary ml-1 px-4 py-2">
            Start triage
          </Link>
        </nav>
      </div>
    </header>
  );
}

function PulseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12h4l2-6 4 12 2-6h6" />
    </svg>
  );
}
