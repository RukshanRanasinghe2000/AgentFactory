"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu } from "lucide-react";
import clsx from "clsx";

const links = [
  { href: "/", label: "Home" },
  { href: "/builder", label: "Builder" },
  { href: "/agents", label: "Agents" },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="glass sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
      <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
        <Cpu className="text-violet-400" size={22} />
        <span>Agent<span className="text-violet-400">Factory</span></span>
      </Link>

      <div className="flex items-center gap-1">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={clsx(
              "px-4 py-1.5 rounded-lg text-sm transition-colors",
              pathname === l.href
                ? "bg-violet-600 text-white"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            {l.label}
          </Link>
        ))}
        <Link
          href="/builder"
          className="ml-4 px-4 py-1.5 rounded-lg text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors"
        >
          + New Agent
        </Link>
      </div>
    </nav>
  );
}
