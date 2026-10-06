"use client";
import { useState } from "react";
import Link from "next/link";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");
  const [link, setLink] = useState("");
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/forgot-password", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) });
    const data = await res.json();
    if (data.resetUrl) setLink(data.resetUrl);
    setMsg("Se o e-mail existir, enviamos instruções. Em desenvolvimento, o link aparece abaixo.");
  }
  return (
    <main className="min-h-screen bg-[#020208] relative overflow-hidden grid place-items-center px-4">
      <div className="absolute inset-0 bg-grid opacity-20 pointer-events-none" />
      <div className="absolute top-0 left-1/2 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none -translate-x-1/2" />
      <form onSubmit={submit} className="w-full max-w-md bg-black/40 backdrop-blur-xl border border-blue-500/20 rounded-2xl p-6 space-y-4 glow-blue relative">
        <h1 className="text-xl font-black text-white">Recuperar senha</h1>
        <p className="text-sm text-slate-400">Enviaremos um link para redefinir</p>
        <input className="w-full bg-white/[0.06] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50" placeholder="Seu e-mail" value={email} onChange={e=>setEmail(e.target.value)} required />
        <button className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black glow-blue">Enviar instruções</button>
        {msg && <p className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 p-3 rounded-xl">{msg}</p>}
        {link && <p className="text-xs break-all bg-white/5 border border-white/10 p-3 rounded-xl"><a href={link} className="text-cyan-300 underline">Link de redefinição: {link}</a></p>}
        <Link href="/login" className="block text-center text-xs text-cyan-300 underline">Voltar ao login</Link>
      </form>
    </main>
  );
}
