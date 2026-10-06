"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/dashboard", label: "QR Codes", icon: "◧", exact: true },
  { href: "/dashboard/nfcs", label: "NFCs", icon: "((•))", exact: false },
];

export default function Sidebar({ userName }: { userName: string }) {
  const pathname = usePathname();
  return (
    <aside className="w-full md:w-60 shrink-0 md:min-h-screen border-b md:border-b-0 md:border-r border-blue-500/20 bg-black/40 backdrop-blur-xl">
      <div className="px-4 py-4 flex md:flex-col gap-4 md:gap-6 md:sticky md:top-0">
        <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 grid place-items-center font-black text-white text-sm glow-blue">QR</div>
          <div>
            <div className="font-black tracking-widest text-sm text-white">QR FLOW</div>
            <div className="text-[10px] tracking-[0.2em] text-cyan-400 -mt-1">FUTURE • DYNAMIC</div>
          </div>
        </Link>
        <nav className="flex md:flex-col gap-2 flex-1">
          {ITEMS.map((it) => {
            const active = it.exact ? pathname === it.href : pathname?.startsWith(it.href);
            return (
              <Link
                key={it.href}
                href={it.href}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold tracking-wide transition active:scale-95 ${
                  active
                    ? "bg-gradient-to-r from-blue-600 to-cyan-500 text-white glow-blue"
                    : "bg-white/[0.04] border border-white/10 text-slate-300 hover:bg-white/10"
                }`}
              >
                <span className="text-xs w-8 text-center">{it.icon}</span>
                {it.label}
              </Link>
            );
          })}
        </nav>
        <div className="hidden md:flex items-center gap-3 pt-4 border-t border-white/10">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-cyan-400 grid place-items-center text-xs font-bold shrink-0">●</div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] text-slate-400">Conectado como</div>
            <div className="text-sm font-semibold text-white truncate">{userName}</div>
          </div>
          <Link href="/api/auth/signout" className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 transition active:scale-95">Sair</Link>
        </div>
        <div className="md:hidden ml-auto">
          <Link href="/api/auth/signout" className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white">Sair</Link>
        </div>
      </div>
    </aside>
  );
}
