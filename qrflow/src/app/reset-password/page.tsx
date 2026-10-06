"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";

function ResetForm() {
  const sp = useSearchParams();
  const token = sp.get("token") || "";
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const router = useRouter();
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/reset-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, password }) });
    const data = await res.json();
    if (!res.ok) setMsg(data.error);
    else { setMsg("Senha redefinida! Redirecionando..."); setTimeout(()=>router.push("/login"),1500); }
  }
  return (
    <form onSubmit={submit} className="w-full max-w-sm bg-black/40 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6 space-y-4 glow-blue">
      <h1 className="text-xl font-black text-white">Redefinir senha</h1>
      {!token && <p className="text-sm text-red-300 bg-red-500/10 border border-red-500/20 p-3 rounded-xl">Token ausente. Use o link enviado por e-mail.</p>}
      <input className="w-full bg-white/[0.06] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50" type="password" placeholder="Nova senha" value={password} onChange={e=>setPassword(e.target.value)} required />
      <button className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black glow-blue">Salvar nova senha</button>
      {msg && <p className="text-sm bg-white/5 border border-white/10 p-3 rounded-xl text-slate-200">{msg}</p>}
      <Link href="/login" className="block text-center text-xs text-cyan-300 underline">Voltar ao login</Link>
    </form>
  );
}

export default function Reset() {
  return (
    <main className="min-h-screen bg-[#020208] relative overflow-hidden grid place-items-center px-4">
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 to-transparent pointer-events-none" />
      <Suspense fallback={<div className="p-6 text-white">Carregando...</div>}>
        <ResetForm />
      </Suspense>
    </main>
  );
}
