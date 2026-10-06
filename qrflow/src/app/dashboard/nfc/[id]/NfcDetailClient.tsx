"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Metrics = {
  qr: number;
  nfc: number;
  total: number;
  byDay: { day: string; qr: number; nfc: number; total: number }[];
  lastAccess: { qr: string | null; nfc: string | null; overall: string | null };
};

export type NfcDetail = {
  id: string;
  code: string;
  client: string;
  fullName: string;
  nfcUrl: string;
  qrUrl: string | null;
  destinationUrl: string;
  nfcStatus: string;
  qrStatus: string;
  createdAt: string;
  metrics: Metrics;
};

export default function NfcDetailClient({ initial }: { initial: NfcDetail }) {
  const router = useRouter();
  const [d, setD] = useState(initial);
  const [dest, setDest] = useState(initial.destinationUrl);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  async function reload() {
    const res = await fetch(`/api/qr/${d.id}`);
    if (res.ok) {
      const q = await res.json();
      setD({
        ...d,
        client: String(q.name).replace(/^\d{3,}\s*-\s*/, ""),
        fullName: q.name,
        destinationUrl: q.destinationUrl,
        nfcStatus: q.nfcStatus,
        qrStatus: q.qrStatus ?? q.status,
        qrUrl: q.qrUrl,
        nfcUrl: q.nfcUrl,
        metrics: q.metrics,
      });
      setDest(q.destinationUrl);
    }
  }

  async function saveDestination(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/qr/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ destinationUrl: dest }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || "Erro ao salvar destino");
      } else {
        await reload();
      }
    } finally {
      setSaving(false);
    }
  }

  async function setNfcStatus(nfcStatus: "ACTIVE" | "PAUSED") {
    setBusy(true);
    try {
      await fetch(`/api/qr/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nfcStatus }),
      });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function pauseWhole(paused: boolean) {
    setBusy(true);
    try {
      await fetch(`/api/qr/${d.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrStatus: paused ? "PAUSED" : "ACTIVE",
          nfcStatus: paused ? "PAUSED" : "ACTIVE",
        }),
      });
      await reload();
    } finally {
      setBusy(false);
    }
  }

  async function archive() {
    if (!confirm("Arquivar esta placa? QR e NFC saem das listas, mas o histórico é mantido.")) return;
    await fetch(`/api/qr/${d.id}`, { method: "DELETE" });
    router.push("/dashboard/nfcs");
  }

  const wholePaused = d.qrStatus !== "ACTIVE" && d.nfcStatus !== "ACTIVE";

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white">NFC <span className="text-amber-300">/n/{d.code}</span></h1>
        <p className="text-xs text-slate-400 tracking-widest uppercase mt-1">{d.client}</p>
      </div>

      {/* Métricas separadas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="px-4 py-3 rounded-xl bg-white/[0.04] border border-blue-500/20 text-center">
          <div className="text-[10px] tracking-widest text-slate-400">QR</div>
          <div className="text-xl font-black text-cyan-300">{d.metrics.qr}</div>
        </div>
        <div className="px-4 py-3 rounded-xl bg-white/[0.04] border border-amber-400/30 text-center">
          <div className="text-[10px] tracking-widest text-slate-400">NFC</div>
          <div className="text-xl font-black text-amber-300">{d.metrics.nfc}</div>
        </div>
        <div className="px-4 py-3 rounded-xl bg-white/[0.04] border border-blue-500/20 text-center">
          <div className="text-[10px] tracking-widest text-slate-400">TOTAL</div>
          <div className="text-xl font-black text-white">{d.metrics.total}</div>
        </div>
      </div>

      {/* Info */}
      <div className="p-5 rounded-2xl bg-black/40 border border-blue-500/20 space-y-3 text-sm">
        <div className="flex flex-wrap justify-between gap-2">
          <span className="text-slate-400">URL permanente da NFC</span>
          <span className="font-mono text-amber-200">/n/{d.code}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => navigator.clipboard.writeText(d.nfcUrl)} className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 active:scale-95 transition">⧉ Copiar link NFC</button>
          <a href={d.nfcUrl} target="_blank" className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white hover:bg-white/10 active:scale-95 transition">Testar ↗</a>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <span className="text-slate-400">Destino atual (QR + NFC)</span>
          <a href={d.destinationUrl} target="_blank" className="font-mono text-cyan-300 underline break-all">{d.destinationUrl}</a>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <span className="text-slate-400">Criada em</span>
          <span className="text-white">{new Date(d.createdAt).toLocaleString("pt-BR")}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <span className="text-slate-400">Último acesso</span>
          <span className="text-white">{d.metrics.lastAccess.overall ? new Date(d.metrics.lastAccess.overall).toLocaleString("pt-BR") : "—"}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-2">
          <span className="text-slate-400">Último acesso NFC</span>
          <span className="text-white">{d.metrics.lastAccess.nfc ? new Date(d.metrics.lastAccess.nfc).toLocaleString("pt-BR") : "—"}</span>
        </div>
        <div className="flex flex-wrap justify-between gap-2 items-center">
          <span className="text-slate-400">Status NFC</span>
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${d.nfcStatus === "ACTIVE" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"}`}>
            {d.nfcStatus === "ACTIVE" ? "Ativa" : "Pausada"}
          </span>
        </div>
        <div className="flex flex-wrap justify-between gap-2 items-center">
          <span className="text-slate-400">Status QR</span>
          <span className={`px-3 py-1 rounded-full text-[11px] font-bold border ${d.qrStatus === "ACTIVE" ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30" : "bg-amber-500/15 text-amber-300 border-amber-500/30"}`}>
            {d.qrStatus === "ACTIVE" ? "Ativo" : "Pausado"}
          </span>
        </div>
      </div>

      {/* Alterar destino */}
      <form onSubmit={saveDestination} className="p-5 rounded-2xl bg-black/40 border border-blue-500/20 space-y-3">
        <div className="text-xs tracking-[0.2em] text-blue-300">ALTERAR DESTINO (QR + NFC JUNTOS)</div>
        <input value={dest} onChange={(e) => setDest(e.target.value)} placeholder="https://..." className="w-full bg-white/[0.06] border border-blue-500/20 rounded-xl px-4 py-3 text-sm text-white font-mono" required />
        <button disabled={saving} className="w-full py-3 rounded-full bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold active:scale-[0.98] transition disabled:opacity-60">
          {saving ? "Salvando…" : "Salvar destino"}
        </button>
      </form>

      {/* Ações */}
      <div className="flex flex-wrap gap-2">
        <button disabled={busy} onClick={() => setNfcStatus(d.nfcStatus === "ACTIVE" ? "PAUSED" : "ACTIVE")} className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 active:scale-95 transition disabled:opacity-60">
          {d.nfcStatus === "ACTIVE" ? "Pausar NFC" : "Ativar NFC"}
        </button>
        <button disabled={busy} onClick={() => pauseWhole(!wholePaused)} className="px-5 py-2.5 rounded-full bg-white/5 border border-white/10 text-sm text-white hover:bg-white/10 active:scale-95 transition disabled:opacity-60">
          {wholePaused ? "Ativar placa inteira" : "Pausar placa inteira"}
        </button>
        <button onClick={archive} className="px-5 py-2.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/25 active:scale-95 transition">Excluir</button>
      </div>

      {/* Gravar etiqueta */}
      <div className="p-5 rounded-2xl bg-black/40 border border-amber-400/30 space-y-2 text-sm">
        <div className="text-xs tracking-[0.2em] text-amber-300">CONFIGURAR / GRAVAR NFC</div>
        <p className="text-slate-300 text-xs leading-relaxed">
          1. Copie o link NFC acima. 2. Abra um app de gravação (ex. NFC Tools) no celular. 3. Escolha “Gravar URL/URI”, cole o link e aproxime a etiqueta. 4. Teste aproximando o celular — deve abrir o destino.
        </p>
      </div>

      {/* Histórico */}
      <div className="rounded-2xl overflow-hidden border border-blue-500/20 bg-black/30">
        <div className="px-5 py-3 text-xs tracking-[0.2em] text-cyan-300 border-b border-blue-500/20">HISTÓRICO POR DIA</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] tracking-[0.2em] text-slate-400">
              <tr><th className="p-3 text-left">DIA</th><th className="p-3 text-left">QR</th><th className="p-3 text-left">NFC</th><th className="p-3 text-left">TOTAL</th></tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {[...d.metrics.byDay].reverse().map((r) => (
                <tr key={r.day}>
                  <td className="p-3 font-mono text-slate-300">{r.day}</td>
                  <td className="p-3 text-cyan-300 font-bold">{r.qr}</td>
                  <td className="p-3 text-amber-300 font-bold">{r.nfc}</td>
                  <td className="p-3 text-white font-bold">{r.total}</td>
                </tr>
              ))}
              {d.metrics.byDay.length === 0 && (
                <tr><td colSpan={4} className="p-6 text-center text-slate-500 text-xs">Sem acessos ainda.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
