"use client";
import { useState } from "react";
import Link from "next/link";

export default function AdminClient({ users: initial }: { users: any[] }) {
  const [users, setUsers] = useState(initial);
  const [q, setQ] = useState("");

  async function search() {
    const res = await fetch(`/api/admin/users?q=${encodeURIComponent(q)}`);
    if (res.ok) {
      const data = await res.json();
      setUsers(data.map((u: any) => ({ ...u, createdAt: u.createdAt, suspendedAt: u.suspendedAt, qrCount: u._count.qrCodes })));
    }
  }

  async function toggle(userId: string, suspended: boolean) {
    const action = suspended ? "reactivate" : "suspend";
    await fetch("/api/admin/users", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, action }) });
    setUsers(users.map((u) => (u.id === userId ? { ...u, suspendedAt: suspended ? null : new Date().toISOString() } : u)));
  }

  return (
    <div className="min-h-screen bg-[#020208] relative overflow-hidden">
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-black/40 border-b border-blue-500/20">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-600 to-cyan-400 grid place-items-center text-white font-black text-xs glow-blue">QR</div>
            <span className="font-black tracking-widest text-white">QR FLOW • ADMIN</span>
          </div>
          <Link href="/dashboard" className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10">← Dashboard</Link>
        </div>
      </header>
      <main className="relative max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-xl font-black text-white tracking-wide">Gerenciamento de Usuários</h1>
        <p className="text-xs tracking-[0.2em] text-cyan-300">CONTROLE TOTAL DA PLATAFORMA</p>
        <div className="mt-4 flex gap-2">
          <input className="flex-1 bg-white/[0.06] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50" placeholder="Buscar por nome ou e-mail" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==="Enter"&&search()} />
          <button onClick={search} className="px-6 py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-sm glow-blue">Buscar</button>
        </div>
        <div className="mt-6 rounded-2xl overflow-hidden border border-blue-500/20 bg-black/30 backdrop-blur-xl">
          <table className="w-full text-sm">
            <thead className="bg-blue-600/10 text-[10px] tracking-[0.2em] text-cyan-300 border-b border-blue-500/20"><tr><th className="p-4 text-left">USUÁRIO</th><th className="p-4 text-left">E-MAIL</th><th className="p-4 text-left">ROLE</th><th className="p-4 text-left">QRs</th><th className="p-4 text-left">STATUS</th><th className="p-4 text-left">AÇÃO</th></tr></thead>
            <tbody className="divide-y divide-white/5">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-white/[0.03]">
                  <td className="p-4 font-bold text-white">{u.name}</td>
                  <td className="p-4 text-slate-400 font-mono text-xs">{u.email}</td>
                  <td className="p-4"><span className={`px-2 py-1 rounded-full text-xs font-bold border ${u.role==="ADMIN"?"bg-blue-500/15 text-cyan-300 border-blue-500/30":"bg-white/5 text-slate-300 border-white/10"}`}>{u.role}</span></td>
                  <td className="p-4 text-white">{u.qrCount}</td>
                  <td className="p-4">{u.suspendedAt ? <span className="px-2 py-1 rounded-full bg-red-500/15 text-red-300 border border-red-500/30 text-xs font-bold">Suspenso</span> : <span className="px-2 py-1 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-bold">Ativo</span>}</td>
                  <td className="p-4"><button onClick={()=>toggle(u.id, !!u.suspendedAt)} className={`px-4 py-1.5 rounded-full text-xs font-bold ${u.suspendedAt?"bg-emerald-600 text-white":"bg-red-600 text-white"} hover:opacity-90`}>{u.suspendedAt?"Reativar":"Suspender"}</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
