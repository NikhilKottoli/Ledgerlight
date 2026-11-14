"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const routes = [
  { href: "/", label: "Overview" },
  { href: "/network", label: "Network" },
  { href: "/intents", label: "Intents" },
  { href: "/flows", label: "Flows" },
  { href: "/value", label: "Value" },
  { href: "/thesis", label: "Thesis" },
  { href: "/methodology", label: "Methodology" },
] as const;

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-40 bg-neutral-950/80 backdrop-blur-sm border-b border-neutral-800">
      <div className="mx-auto max-w-7xl px-4">
        <div className="flex h-14 items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight">NEAR Value Intelligence</span>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            {routes.map((route) => (
              <Link
                key={route.href}
                href={route.href}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                  pathname === route.href
                    ? "bg-blue-900/30 text-blue-300"
                    : "text-muted hover:text-white hover:bg-neutral-800"
                }`}
              >
                {route.label}
              </Link>
            ))}
          </div>

          <div className="md:hidden">
            <button className="p-2 text-muted hover:text-white" aria-label="Menu">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
