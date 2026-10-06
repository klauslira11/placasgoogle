"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setErr("Credenciais inválidas ou usuário suspenso");
    else router.push("/dashboard");
  }
  return (
    <main className="min-h-screen bg-[#020208] relative overflow-hidden grid place-items-center px-4 py-10">
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute -top-32 -right-32 w-[700px] h-[700px] bg-blue-600/25 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[600px] h-[600px] bg-cyan-500/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="w-full max-w-md relative">
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-cyan-400 grid place-items-center font-black text-white glow-blue">QR</div>
            <div className="text-left">
              <div className="font-black tracking-[0.2em] text-white">QR FLOW</div>
              <div className="text-[10px] tracking-[0.3em] text-cyan-400">FUTURE DYNAMIC</div>
            </div>
          </div>
          <h1 className="mt-6 text-2xl font-black tracking-tight text-white">Bem-vindo de volta</h1>
          <p className="text-sm text-slate-400">Entre para gerenciar seus QR Codes</p>
        </div>
        <form onSubmit={onSubmit} className="bg-black/40 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6 space-y-4 glow-blue">
          {err && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">{err}</p>}
          <div>
            <label className="text-[11px] tracking-[0.2em] text-cyan-300">E-MAIL</label>
            <input className="mt-1 w-full bg-white/[0.06] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 focus:bg-white/[0.08]" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required />
          </div>
          <div>
            <label className="text-[11px] tracking-[0.2em] text-cyan-300">SENHA</label>
            <input className="mt-1 w-full bg-white/[0.06] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50" placeholder="••••••••" type="password" value={password} onChange={e=>setPassword(e.target.value)} required />
          </div>
          <button disabled={loading} className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black tracking-wide glow-blue hover:from-blue-500 hover:to-cyan-400 transition disabled:opacity-50">
            {loading ? "Entrando..." : "Entrar →"}
          </button>
          <div className="flex justify-between text-xs">
            <Link href="/register" className="text-cyan-300 hover:text-cyan-200 underline">Criar conta</Link>
            <Link href="/forgot-password" className="text-slate-400 hover:text-white underline">Esqueci a senha</Link>
          </div>
          <div className="pt-3 border-t border-white/5 text-[11px] text-slate-500 font-mono text-center">
            Demo: demo@qrflow.com / demo1234<br/>Admin: admin@qrflow.com / admin123
          </div>
        </form>
      </div>
    </main>
  );
}
