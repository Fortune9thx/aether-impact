"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "./ui/Logo";

const links = [
  { href: "/rounds", label: "Rounds" },
  { href: "/submit", label: "Submit Project" },
  { href: "/about", label: "About" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
        <Link href="/" className="transition-opacity duration-300 hover:opacity-80">
          <Logo />
        </Link>

        <div className="flex items-center gap-8">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm transition-colors duration-300 ${
                  active
                    ? "text-text-primary"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        <button className="rounded-full border border-border bg-surface px-4 py-2 text-sm text-text-primary transition-colors duration-300 hover:border-accent/40 hover:bg-surface-elevated">
          Connect Wallet
        </button>
      </nav>
    </header>
  );
}
