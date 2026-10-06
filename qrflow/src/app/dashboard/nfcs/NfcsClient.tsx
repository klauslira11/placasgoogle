"use client";
import { useState } from "react";
import Link from "next/link";

export type NfcRow = {
  id: string;
  code: string;
  client: string;
  destinationUrl: string;
  nfcUrl: string;
  nfcStatus: string;
  nfcScans: number;
  totalScans: number;
  createdAt: string;
};

export default function NfcsClient({ initial }: { initial: NfcRow[] }) {
  const [list, setList] = useState(initial);
  const [busy, setBusy] = useState<string | null>(null);

  async function refresh() {
    const res = await fetch("/api/qr");
    if (res.ok) {
      const data = await res.json();
      setList(
        data.map((q: any) => ({
          id: q.id,
          code: q.placaNumber ? String(q.placaNumber).padStart(3, "0") : "—",
          client: String(q.name).replace(/^\d{3,}\s*-\s*/, ""),
          destinationUrl: q.destinationUrl,
          nfcUrl: q.nfcUrl,
          nfcStatus: q.nfcStatus,
          nfcScans: q.nfcScans ?? 0,
          totalScans: (q.qrScans ?? 0) + (q.nfcScans ?? 0),
          createdAt: q.createdAt,
        }))
      );
    }
  }

  async function setStatus(id: string, nfcStatus: "ACTIVE" | "PAUSED") {
    setBusy(id);
    try {
      await fetch(`/api/qr/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nfcStatus }),
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function archive(id: string) {
    if (!confirm("Arquivar esta NFC? Ela sai da lista mas o histórico é mantido.")) return;
    await fetch(`/api/qr/${id}`, { method: "DELETE" });
    await refresh();
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight">NF<span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">Cs</span></h1>
          <p className="text-xs text-slate-400 tracking-widest uppercase mt-1">Criadas automaticamente junto aos QR Codes</p>
        </div>
        <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-blue-500/20 backdrop-blur text-center">
          <div className="text-[10px] tracking-widest text-slate-400">TOTAL</div>
          <div className="text-lg font-black text-white">{list.length}</div>
        </div>
      </div>

      <div className="mt-6 rounded-2xl overflow-hidden border border-blue-500/20 bg-black/30 backdrop-blur-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-blue-600/10 text-[10px] tracking-[0.2em] text-cyan-300 border-b border-blue-500/20">
              <tr>
                <th className="p-4 text-left">NFC</th>
                <th className="p-4 text-left">CLIENTE</th>
                <th className="p-4 text-left">DESTINO</th>
                <th className="p-4 text-left">ACESSOS</th>
                <th className="p-4 text-left">STATUS</th>
                <th className="p-4 text-left">AÇÕES</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {list.map((n) => (
                <tr key={n.id} className="hover:bg-white/[0.03] transition">
                  <td className="p-4 font-mono font-black text-amber-300">/n/{n.code}</td>
                  <td className="p-4 font-bold text-white">{n.client}</td>
                  <td className="p-4 max-w-[220px] truncate text-xs text-slate-400 font-mono">
                    <a href={n.destinationUrl} target="_blank" className="hover:text-cyan-300 underline">{n.destinationUrl}</a>
                  </td>
                  <td className="p-4 text-white font-black">{n.nfcScans}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border ${n.nfcStatus === "ACTIVE" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"}`}>
                      {n.nfcStatus === "ACTIVE" ? "Ativa" : "Pausada"}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-wrap gap-1.5 max-w-[280px]">
                      <Link href={`/dashboard/nfc/${n.id}`} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 active:scale-95 transition">Abrir</Link>
                      <button onClick={() => navigator.clipboard.writeText(n.nfcUrl)} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 active:scale-95 transition">Copiar link</button>
                      <button disabled={busy === n.id} onClick={() => setStatus(n.id, n.nfcStatus === "ACTIVE" ? "PAUSED" : "ACTIVE")} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 active:scale-95 transition disabled:opacity-60">
                        {n.nfcStatus === "ACTIVE" ? "Pausar" : "Ativar"}
                      </button>
                      <button onClick={() => archive(n.id)} className="px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs hover:bg-red-500/25 active:scale-95 transition">Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr><td colSpan={6} className="p-10 text-center"><div className="text-slate-400">Nenhuma NFC ainda.</div><div className="text-xs text-slate-500">Elas são criadas automaticamente ao criar um QR Code.</div></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
