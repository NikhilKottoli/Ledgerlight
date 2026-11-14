"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconClose,
  IconFlows,
  IconIntents,
  IconMenu,
  IconMethodology,
  IconNetwork,
  IconOverview,
  IconShield,
  IconThesis,
  IconValue,
  LogoMark,
} from "./icons";

const navigation = [
  {
    label: "Workspace",
    items: [{ href: "/", label: "Overview", icon: IconOverview }],
  },
  {
    label: "Analysis",
    items: [
      { href: "/network", label: "Network", icon: IconNetwork },
      { href: "/intents", label: "Intents", icon: IconIntents },
      { href: "/flows", label: "Flows", icon: IconFlows },
      { href: "/value", label: "Value", icon: IconValue },
    ],
  },
  {
    label: "Research",
    items: [
      { href: "/thesis", label: "Thesis", icon: IconThesis },
      { href: "/methodology", label: "Methodology", icon: IconMethodology },
    ],
  },
];

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const currentPath = pathname.replace(/\/+$/, "") || "/";

  return (
    <nav className="flex flex-col gap-7" aria-label="Primary navigation">
      {navigation.map((group) => (
        <div key={group.label}>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const active = currentPath === item.href || (item.href !== "/" && currentPath.startsWith(`${item.href}/`));
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={`group relative flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-medium transition-colors ${
                      active
                        ? "bg-accent-soft text-accent-deep"
                        : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                    }`}
                  >
                    {active && (
                      <span className="absolute -left-[9px] top-1/2 h-4 w-[3px] -translate-y-1/2 rounded-full bg-accent" />
                    )}
                    <Icon className={`h-[17px] w-[17px] ${active ? "text-accent" : "text-ink-faint group-hover:text-ink-muted"}`} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function Wordmark({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link href="/" onClick={onNavigate} className="flex min-w-0 items-center gap-2.5">
      <LogoMark className="h-9 w-9 shrink-0 shadow-[0_6px_16px_-8px_rgba(180,90,60,0.65)]" />
      <span className="min-w-0">
        <span className="block text-[14.5px] font-semibold leading-tight tracking-[-0.02em] text-ink">LedgerLight</span>
        <span className="block text-[9.5px] font-medium uppercase tracking-[0.13em] text-ink-faint">
          NEAR value intelligence
        </span>
      </span>
    </Link>
  );
}

export default function Navbar() {
  const pathname = usePathname();
  const currentPath = pathname.replace(/\/+$/, "") || "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const current = navigation.flatMap((g) => g.items).find((i) => i.href === currentPath);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [mobileOpen]);

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[252px] flex-col border-r border-line bg-surface/95 backdrop-blur lg:flex">
        <div className="px-5 pb-5 pt-6">
          <Wordmark />
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-5">
          <NavLinks />
        </div>
        <div className="border-t border-line px-5 py-4">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 rounded-md border border-line bg-surface-subtle p-1.5 text-ink-muted">
              <IconShield className="h-3.5 w-3.5" />
            </span>
            <div>
              <p className="text-[11.5px] font-medium text-ink">Evidence before narrative</p>
              <p className="mt-0.5 text-[10.5px] leading-relaxed text-ink-faint">
                Measured, derived and modeled values are kept distinct.
              </p>
            </div>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-line bg-canvas/90 px-4 backdrop-blur-md sm:px-6 lg:hidden">
        <Wordmark />
        <div className="flex items-center gap-2">
          <span className="hidden text-[12px] font-medium text-ink-muted sm:block">{current?.label || "Overview"}</span>
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
            className="rounded-lg border border-line bg-surface p-2 text-ink-muted shadow-[0_1px_2px_rgba(33,29,25,0.04)] transition-colors hover:text-ink"
          >
            <IconMenu className="h-5 w-5" />
          </button>
        </div>
      </header>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            className="absolute inset-0 bg-ink/25 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <div
            id="mobile-navigation"
            className="absolute inset-y-0 left-0 flex w-[290px] max-w-[86vw] flex-col border-r border-line bg-surface shadow-pop"
          >
            <div className="flex items-center justify-between px-5 pb-5 pt-5">
              <Wordmark onNavigate={() => setMobileOpen(false)} />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Close navigation"
                className="rounded-lg p-1.5 text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
              >
                <IconClose className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 pb-6">
              <NavLinks onNavigate={() => setMobileOpen(false)} />
            </div>
            <div className="border-t border-line px-5 py-4">
              <p className="text-[11px] leading-relaxed text-ink-faint">
                Follow the money. Verify the value.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
