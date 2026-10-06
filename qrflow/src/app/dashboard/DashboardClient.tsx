"use client";
import { useState } from "react";

type Qr = {
  id: string;
  name: string;
  slug: string;
  placaNumber?: number | null;
  destinationUrl: string;
  status: string;
  qrStatus: string;
  nfcStatus: string;
  qrUrl?: string | null;
  nfcUrl?: string | null;
  qrScans?: number;
  nfcScans?: number;
  scansCount?: number;
  fgColor: string;
  bgColor: string;
  createdAt: string;
  updatedAt: string;
};

function placaCode(n?: number | null): string | null {
  return n ? String(n).padStart(3, "0") : null;
}

export default function DashboardClient({
  qrs,
  stats,
}: {
  qrs: Qr[];
  stats: { total: number; active: number; paused: number };
  userName: string;
}) {
  const [list, setList] = useState(qrs);
  const [showForm, setShowForm] = useState(false);
  const [lastCreated, setLastCreated] = useState<Qr | null>(null);
  const [form, setForm] = useState({
    name: "",
    destinationUrl: "",
    slug: "",
    fgColor: "#0066ff",
    bgColor: "#ffffff",
    margin: 4,
    size: 1000,
    errorLevel: "M",
    transparentBg: false,
    status: "ACTIVE",
  });
  const [editing, setEditing] = useState<Qr | null>(null);
  const [creating, setCreating] = useState(false);

  function toQr(q: any): Qr {
    return {
      id: q.id,
      name: q.name,
      slug: q.slug,
      placaNumber: q.placaNumber ?? null,
      destinationUrl: q.destinationUrl,
      status: q.status ?? q.qrStatus ?? "ACTIVE",
      qrStatus: q.qrStatus ?? q.status ?? "ACTIVE",
      nfcStatus: q.nfcStatus ?? "ACTIVE",
      qrUrl: q.qrUrl ?? null,
      nfcUrl: q.nfcUrl ?? null,
      qrScans: q.qrScans ?? 0,
      nfcScans: q.nfcScans ?? 0,
      scansCount: q.scansCount ?? 0,
      fgColor: q.fgColor,
      bgColor: q.bgColor,
      createdAt: q.createdAt,
      updatedAt: q.updatedAt,
    };
  }

  async function refresh() {
    const res = await fetch("/api/qr");
    if (res.ok) {
      const data = await res.json();
      setList(data.map(toQr));
    }
  }

  async function createQr(e: React.FormEvent) {
    e.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      const res = await fetch("/api/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) alert(data.error || JSON.stringify(data));
      else {
        const created: Qr = toQr(data);
        setLastCreated(created);
        setShowForm(false);
        setForm({ name: "", destinationUrl: "", slug: "", fgColor: "#0066ff", bgColor: "#ffffff", margin: 4, size: 1000, errorLevel: "M", transparentBg: false, status: "ACTIVE" });
        await refresh();
      }
    } finally {
      setCreating(false);
    }
  }

  async function toggleStatus(qr: Qr) {
    await fetch(`/api/qr/${qr.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ qrStatus: qr.qrStatus === "ACTIVE" ? "PAUSED" : "ACTIVE" }),
    });
    await refresh();
  }

  async function duplicate(id: string) {
    const res = await fetch(`/api/qr/${id}/duplicate`, { method: "POST" });
    const data = await res.json();
    if (res.ok) {
      setLastCreated(toQr(data));
    }
    await refresh();
  }

  async function del(id: string) {
    if (!confirm("Arquivar esta placa? Ela sai da lista mas o histórico é mantido.")) return;
    await fetch(`/api/qr/${id}`, { method: "DELETE" });
    await refresh();
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    const payload: any = { name: editing.name, destinationUrl: editing.destinationUrl };
    const res = await fetch(`/api/qr/${editing.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!res.ok) {
      const d = await res.json();
      alert(d.error || "Erro");
    } else {
      setEditing(null);
      await refresh();
    }
  }

  return (
    <>
      <div>
        {/* Title + Stats minimal */}
        <div className="flex flex-wrap gap-3 items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-black tracking-tight">Painel <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">de Controle</span></h1>
            <p className="text-xs text-slate-400 tracking-widest uppercase mt-1">Gerencie seus QR Codes dinâmicos</p>
          </div>
          <div className="flex gap-2">
            <div className="px-4 py-2 rounded-xl bg-white/[0.04] border border-blue-500/20 backdrop-blur text-center">
              <div className="text-[10px] tracking-widest text-slate-400">TOTAL</div>
              <div className="text-lg font-black text-white">{stats.total}</div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 backdrop-blur text-center">
              <div className="text-[10px] tracking-widest text-emerald-300">ATIVOS</div>
              <div className="text-lg font-black text-emerald-400">{stats.active}</div>
            </div>
            <div className="px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 backdrop-blur text-center">
              <div className="text-[10px] tracking-widest text-amber-300">PAUSADOS</div>
              <div className="text-lg font-black text-amber-400">{stats.paused}</div>
            </div>
          </div>
        </div>

        <div className="mt-6 flex justify-between items-center">
          <h2 className="text-sm font-bold tracking-[0.2em] text-cyan-300">SEUS QR CODES</h2>
          <button onClick={() => setShowForm(!showForm)} className="px-5 py-2.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-sm font-bold tracking-wide glow-blue hover:from-blue-500 hover:to-cyan-400 transition active:scale-95">
            {showForm ? "✕ Fechar" : "+ Novo QR Code"}
          </button>
        </div>

        {/* Success card - immediate download */}
        {lastCreated && (
          <div className="mt-4 p-5 rounded-2xl bg-gradient-to-br from-blue-600/20 to-cyan-500/10 border border-cyan-400/30 backdrop-blur-xl glow-blue relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-transparent pointer-events-none" />
            <div className="relative flex flex-col md:flex-row gap-5 items-center">
              <div className="w-28 h-28 rounded-xl bg-white p-2 shrink-0 border border-white/20">
                <img src={`/api/qr/${lastCreated.id}/png`} alt="qr" className="w-full h-full object-contain" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs tracking-[0.2em] text-cyan-300">QR CRIADO COM SUCESSO {lastCreated.placaNumber ? `• PLACA ${String(lastCreated.placaNumber).padStart(3, "0")}` : ""}</div>
                <div className="text-lg font-black text-white">{lastCreated.name}</div>
                <div className="text-xs text-cyan-200/70 font-mono">/{lastCreated.slug} → {lastCreated.destinationUrl}</div>
                {placaCode(lastCreated.placaNumber) && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-[11px] font-mono px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-cyan-200">QR /q/{placaCode(lastCreated.placaNumber)}</span>
                    <span className="text-[11px] font-mono px-2 py-1 rounded-lg bg-white/10 border border-white/10 text-amber-200">NFC /n/{placaCode(lastCreated.placaNumber)}</span>
                  </div>
                )}
                <div className="text-[11px] text-slate-400 mt-1">Pronto para impressão • QR e NFC apontam para o mesmo destino</div>
              </div>
              <div className="flex flex-col gap-2 shrink-0 w-full md:w-auto">
                <a href={`/api/qr/${lastCreated.id}/png`} download className="px-6 py-3 rounded-full bg-white text-black font-black text-sm text-center hover:bg-slate-100 transition active:scale-95">⬇ QR separado (PNG)</a>
                <a href={`/api/qr/${lastCreated.id}/placa`} download className="px-6 py-3 rounded-full bg-gradient-to-r from-amber-400 to-orange-500 text-black font-black text-sm text-center hover:brightness-110 transition active:scale-95">⬇ Placa pronta p/ impressão</a>
                {placaCode(lastCreated.placaNumber) && (
                  <>
                    <button onClick={() => lastCreated.qrUrl && navigator.clipboard.writeText(lastCreated.qrUrl)} className="px-6 py-2 rounded-full bg-white/10 border border-white/20 text-white text-xs font-bold active:scale-95 transition">⧉ Copiar link QR</button>
                    <button onClick={() => lastCreated.nfcUrl && navigator.clipboard.writeText(lastCreated.nfcUrl)} className="px-6 py-2 rounded-full bg-white/10 border border-amber-400/30 text-amber-200 text-xs font-bold active:scale-95 transition">⧉ Copiar link NFC</button>
                  </>
                )}
                {lastCreated.qrUrl && <a href={lastCreated.qrUrl} target="_blank" className="text-[11px] text-center text-cyan-300 underline">Testar redirecionamento ↗</a>}
              </div>
              <button onClick={() => setLastCreated(null)} className="absolute top-2 right-3 text-white/50 hover:text-white text-sm">✕</button>
            </div>
          </div>
        )}

        {showForm && (
          <form onSubmit={createQr} className="mt-4 p-5 rounded-2xl bg-black/40 border border-blue-500/20 backdrop-blur-xl space-y-4">
            <div className="text-xs tracking-[0.2em] text-blue-300">NOVO QR CODE DINÂMICO</div>
            <div className="grid md:grid-cols-2 gap-3">
              <input className="bg-white/[0.06] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50 focus:bg-white/[0.08]" placeholder="Nome do QR (ex: Cardápio Loja)" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required />
              <input className="bg-white/[0.06] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400/50" placeholder="https://seu-destino.com" value={form.destinationUrl} onChange={e=>setForm({...form,destinationUrl:e.target.value})} required />
              <input className="bg-white/[0.06] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500" placeholder="slug opcional (ex: promo2026)" value={form.slug} onChange={e=>setForm({...form,slug:e.target.value})} />
              <div className="flex gap-2 items-center flex-wrap">
                <label className="flex items-center gap-2 text-xs bg-white/5 border border-white/10 rounded-full px-3 py-2"> <input type="color" value={form.fgColor} onChange={e=>setForm({...form,fgColor:e.target.value})} className="w-6 h-6 rounded-full border-0 bg-transparent p-0" /> QR</label>
                <label className="flex items-center gap-2 text-xs bg-white/5 border border-white/10 rounded-full px-3 py-2"> <input type="color" value={form.bgColor} onChange={e=>setForm({...form,bgColor:e.target.value})} className="w-6 h-6 rounded-full border-0 bg-transparent p-0" /> Fundo</label>
                <label className="flex items-center gap-2 text-xs bg-white/5 border border-white/10 rounded-full px-3 py-2"><input type="checkbox" checked={form.transparentBg} onChange={e=>setForm({...form,transparentBg:e.target.checked})} className="accent-cyan-500" /> Transparente</label>
              </div>
              <select className="bg-[#0a1628] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white" value={form.errorLevel} onChange={e=>setForm({...form,errorLevel:e.target.value})}>
                <option value="L">Correção L</option><option value="M">Correção M</option><option value="Q">Correção Q</option><option value="H">Correção H</option>
              </select>
              <select className="bg-[#0a1628] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white" value={form.status} onChange={e=>setForm({...form,status:e.target.value})}>
                <option value="ACTIVE">Ativo</option><option value="PAUSED">Pausado</option>
              </select>
            </div>
            <button disabled={creating} className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-black tracking-wide glow-blue flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-70 disabled:cursor-wait">
              {creating ? (
                <>
                  <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                    <path d="M22 12a10 10 0 00-10-10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                  Criando QR Code…
                </>
              ) : (
                "Criar QR Code →"
              )}
            </button>
          </form>
        )}

        <div className="mt-6 rounded-2xl overflow-hidden border border-blue-500/20 bg-black/30 backdrop-blur-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-blue-600/10 text-[10px] tracking-[0.2em] text-cyan-300 border-b border-blue-500/20">
                <tr>
                  <th className="p-4 text-left">PRÉVIA</th>
                  <th className="p-4 text-left">NOME / SLUG</th>
                  <th className="p-4 text-left">DESTINO</th>
                  <th className="p-4 text-left">STATUS</th>
                  <th className="p-4 text-left">AÇÕES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {list.map((qr) => (
                  <tr key={qr.id} className="hover:bg-white/[0.03] transition">
                    <td className="p-4">
                      <div className="w-14 h-14 rounded-xl bg-white p-1.5 border border-white/10">
                        <img src={`/api/qr/${qr.id}/png`} alt="qr" className="w-full h-full object-contain" style={{ background: qr.bgColor }} />
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-bold text-white">{qr.placaNumber ? `${String(qr.placaNumber).padStart(3, "0")} - ` : ""}{qr.name.replace(/^\d{3,}\s*-\s*/, "")}</div>
                      <div className="text-xs font-mono text-cyan-300">/q/{placaCode(qr.placaNumber) ?? qr.slug} <span className="text-amber-300/80">• /n/{placaCode(qr.placaNumber) ?? "…"}</span></div>
                      <div className="text-[11px] text-slate-500 font-mono">QR {qr.qrScans ?? 0} • NFC {qr.nfcScans ?? 0}</div>
                      <div className="flex gap-2">
                        <button onClick={() => qr.qrUrl && navigator.clipboard.writeText(qr.qrUrl)} className="text-[11px] text-blue-300 hover:text-cyan-300 underline">Copiar QR</button>
                        <button onClick={() => qr.nfcUrl && navigator.clipboard.writeText(qr.nfcUrl)} className="text-[11px] text-amber-300 hover:text-amber-200 underline">Copiar NFC</button>
                      </div>
                    </td>
                    <td className="p-4 max-w-[220px] truncate text-xs text-slate-400 font-mono"><a href={qr.destinationUrl} target="_blank" className="hover:text-cyan-300 underline">{qr.destinationUrl}</a></td>
                    <td className="p-4"><span className={`px-3 py-1 rounded-full text-[11px] font-bold tracking-wide border ${qr.qrStatus==="ACTIVE"?"bg-emerald-500/15 text-emerald-300 border-emerald-500/30":"bg-amber-500/15 text-amber-300 border-amber-500/30"}`}>{qr.qrStatus}</span></td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                        <button onClick={()=>setEditing(qr)} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs hover:bg-white/10 active:scale-95 transition">Editar</button>
                        <button onClick={()=>toggleStatus(qr)} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs hover:bg-white/10 active:scale-95 transition">{qr.qrStatus==="ACTIVE"?"Pausar":"Ativar"}</button>
                        <button onClick={()=>duplicate(qr.id)} className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs hover:bg-white/10 active:scale-95 transition">Duplicar</button>
                        <a href={`/api/qr/${qr.id}/png`} download className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs hover:bg-white/10 active:scale-95 transition">QR</a>
                        <a href={`/api/qr/${qr.id}/placa`} download className="px-3 py-1.5 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold glow-blue active:scale-95 transition">Placa</a>
                        {qr.qrUrl && <a href={qr.qrUrl} target="_blank" className="px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs hover:bg-white/10 active:scale-95 transition">Testar ↗</a>}
                        <button onClick={()=>del(qr.id)} className="px-3 py-1.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-xs hover:bg-red-500/25 active:scale-95 transition">Arquivar</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {list.length===0 && <tr><td colSpan={5} className="p-10 text-center"><div className="text-slate-400">Nenhum QR ainda.</div><div className="text-xs text-slate-500">Crie o primeiro e baixe o PNG imediatamente.</div></td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        {editing && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm grid place-items-center p-4 z-50">
            <form onSubmit={saveEdit} className="bg-[#0a1628] border border-blue-500/30 rounded-2xl p-6 w-full max-w-sm space-y-4 glow-blue">
              <h3 className="font-black tracking-wide text-white">Editar QR</h3>
              <input className="w-full bg-white/5 border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white" value={editing.name} onChange={e=>setEditing({...editing,name:e.target.value})} placeholder="Nome" />
              <input className="w-full bg-white/5 border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white" value={editing.destinationUrl} onChange={e=>setEditing({...editing,destinationUrl:e.target.value})} placeholder="https://destino.com" />
              <div className="flex gap-2">
                <button className="flex-1 py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold active:scale-95 transition">Salvar</button>
                <button type="button" onClick={()=>setEditing(null)} className="flex-1 py-3 rounded-full bg-white/5 border border-white/10 text-white active:scale-95 transition">Cancelar</button>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
