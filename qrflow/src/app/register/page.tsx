"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await fetch("/api/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) setErr(data.error?.formErrors?.[0] || data.error || "Erro ao cadastrar");
    else router.push("/login");
  }
  return (
    <main className="min-h-screen bg-[#020208] relative overflow-hidden grid place-items-center px-4 py-10">
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[130px] pointer-events-none" />
      <div className="w-full max-w-md relative">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 grid place-items-center font-black text-white glow-blue">QR</div>
            <div className="text-left">
              <div className="font-black tracking-[0.2em] text-white">QR FLOW</div>
              <div className="text-[10px] tracking-[0.3em] text-cyan-400">CREATE ACCOUNT</div>
            </div>
          </div>
          <h1 className="mt-6 text-2xl font-black text-white">Criar conta</h1>
          <p className="text-sm text-slate-400">Comece a criar QR Codes dinâmicos</p>
        </div>
        <form onSubmit={onSubmit} className="bg-black/40 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6 space-y-4 glow-blue">
          {err && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{String(err)}</p>}
          <div>
            <label className="text-[11px] tracking-[0.2em] text-cyan-300">NOME</label>
            <input className="mt-1 w-full bg-white/[0.06] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50" placeholder="Seu nome" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
          </div>
          <div>
            <label className="text-[11px] tracking-[0.2em] text-cyan-300">E-MAIL</label>
            <input className="mt-1 w-full bg-white/[0.06] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50" placeholder="seu@email.com" type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} required />
          </div>
          <div>
            <label className="text-[11px] tracking-[0.2em] text-cyan-300">SENHA</label>
            <input className="mt-1 w-full bg-white/[0.06] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50" placeholder="Mínimo 8 caracteres" type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} required />
          </div>
          <button disabled={loading} className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black glow-blue hover:from-blue-500 hover:to-cyan-400 transition disabled:opacity-50">{loading ? "Criando..." : "Cadastrar →"}</button>
          <Link href="/login" className="block text-center text-xs text-cyan-300 hover:text-cyan-200 underline">Já tenho conta — Entrar</Link>
        </form>
      </div>
    </main>
  );
}
