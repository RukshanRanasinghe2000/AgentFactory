"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Cpu, Menu, X } from "lucide-react";
import clsx from "clsx";

const links = [
  { href: "/", label: "Home" },
  { href: "/docs", label: "Docs" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <nav className="glass sticky top-0 z-50 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-lg text-white">
          <Cpu className="text-violet-400" size={22} />
          <span>
            Agent<span className="text-violet-400">Factory</span>
            <sup className="text-[9px] text-violet-400 font-semibold ml-0.5 tracking-wide">BETA</sup>
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1">
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

        {/* Mobile hamburger */}
        <button
          className="sm:hidden text-slate-400 hover:text-white transition-colors"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="sm:hidden mt-3 flex flex-col gap-1 border-t border-slate-800 pt-3">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={clsx(
                "px-4 py-2.5 rounded-lg text-sm transition-colors",
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
            onClick={() => setOpen(false)}
            className="mt-1 px-4 py-2.5 rounded-lg text-sm bg-violet-600 hover:bg-violet-500 text-white transition-colors text-center"
          >
            + New Agent
          </Link>
        </div>
      )}
    </nav>
  );
}
