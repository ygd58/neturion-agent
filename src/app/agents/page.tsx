"use client"
import { usePublicClient } from "wagmi"
import { useEffect, useState } from "react"
import PageShell from "@/components/PageShell"
import { Panel, RoleChip, TH, TD, Addr } from "@/components/atoms"
import { CONTRACTS, IDENTITY_ABI, REPUTATION_ABI } from "@/lib/arc"
import { NT, ROLES } from "@/lib/tokens"
import Link from "next/link"

type Agent = {
  id: bigint; owner: string; name: string; role: string
  capabilities: string[]; repScore: number; repCount: number
}

const TRANSFER_EVENT = {
  type: "event" as const, name: "Transfer",
  inputs: [
    { type: "address" as const, name: "from", indexed: true },
    { type: "address" as const, name: "to", indexed: true },
    { type: "uint256" as const, name: "tokenId", indexed: true },
  ],
}

export default function AgentsPage() {
  const client = usePublicClient()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("ALL")
  const [search, setSearch] = useState("")

  useEffect(() => {
    if (!client) return
    async function load() {
      const latest = await (client as any).getBlockNumber()
      const fromBlock = latest > 9000n ? latest - 9000n : 0n
      const logs = await (client as any).getLogs({ address: CONTRACTS.IDENTITY_REGISTRY, event: TRANSFER_EVENT, fromBlock, toBlock: latest })
      const mints = logs.filter(l => (l.args as any).from === "0x0000000000000000000000000000000000000000")
      const loaded: Agent[] = []
      for (const log of mints.slice(-30)) {
        const tokenId = (log.args as any).tokenId as bigint
        if (!tokenId) continue
        try {
          const [owner, uri] = await Promise.all([
            (client as any).readContract({ address: CONTRACTS.IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "ownerOf", args: [tokenId] }) as Promise<string>,
            (client as any).readContract({ address: CONTRACTS.IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "tokenURI", args: [tokenId] }) as Promise<string>,
          ])
          let meta: any = {}
          try { meta = JSON.parse(Buffer.from(uri.replace("data:application/json;base64,", ""), "base64").toString()) } catch {}
          let repScore = 0, repCount = 0
          try {
            const rep = await (client as any).readContract({ address: CONTRACTS.REPUTATION_REGISTRY, abi: REPUTATION_ABI, functionName: "getReputation", args: [tokenId] }) as [bigint, bigint]
            repScore = Number(rep[0]); repCount = Number(rep[1])
          } catch {}
          loaded.push({ id: tokenId, owner, name: meta.name ?? "UNKNOWN", role: meta.role ?? "worker", capabilities: meta.capabilities ?? [], repScore, repCount })
        } catch {}
      }
      setAgents(loaded.reverse())
      setLoading(false)
    }
    load()
  }, [client])

  const filtered = agents.filter(a => {
    const roleMatch = filter === "ALL" || a.role === filter.toLowerCase() || 
      (filter === "ORCH" && a.role === "orchestrator") ||
      (filter === "WRKR" && a.role === "worker") ||
      (filter === "EVAL" && a.role === "evaluator")
    const searchMatch = !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.id.toString().includes(search)
    return roleMatch && searchMatch
  })

  const counts = { ALL: agents.length, ORCH: agents.filter(a => a.role === "orchestrator").length, WRKR: agents.filter(a => a.role === "worker").length, EVAL: agents.filter(a => a.role === "evaluator").length }

  return (
    <PageShell>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.32em", color: NT.green }}>▸ ./registry / agents</div>
        <h1 style={{ margin: "6px 0 4px", fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 800, letterSpacing: "0.08em", color: NT.text, textTransform: "uppercase" }}>
          Agent <span style={{ color: NT.green }}>Registry</span>
        </h1>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", color: NT.textDim }}>
          ERC-8004 · {CONTRACTS.IDENTITY_REGISTRY}
        </div>
      </div>

      {/* Search + Filter */}
      <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10,
          background: NT.surface, border: `1px solid ${NT.border}`, padding: "0 14px" }}>
          <span style={{ color: NT.green }}>⌕</span>
          <input placeholder="SEARCH AGENT_ID / NAME / ADDRESS"
            value={search} onChange={e => setSearch(e.target.value)}
            style={{ background: "transparent", border: "none", color: NT.text,
              fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: "0.06em",
              outline: "none", flex: 1, padding: "11px 0" }} />
        </div>
        <div style={{ display: "flex" }}>
          {Object.entries(counts).map(([k, v], i) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: "0 14px", cursor: "pointer", fontFamily: "'Space Mono', monospace",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
              background: filter === k ? `${NT.green}14` : NT.surface,
              border: `1px solid ${filter === k ? NT.green + "66" : NT.border}`,
              borderLeft: i === 0 ? `1px solid ${filter === k ? NT.green + "66" : NT.border}` : "none",
              color: filter === k ? NT.green : NT.textMuted,
            }}>
              {k} <span style={{ fontSize: 9.5 }}>{v}</span>
            </button>
          ))}
        </div>
        <Link href="/register" style={{
          padding: "0 16px", background: `${NT.green}14`, border: `1px solid ${NT.green}66`,
          color: NT.green, fontFamily: "'Space Mono', monospace", fontSize: 11,
          fontWeight: 700, letterSpacing: "0.14em", textDecoration: "none",
          display: "flex", alignItems: "center"
        }}>+ REGISTER</Link>
      </div>

      <Panel accent={NT.green} style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", background: NT.surface2, borderBottom: `1px solid ${NT.borderHi}` }}>
          <TH w="70px">ID</TH>
          <TH w="180px">NAME</TH>
          <TH w="120px">ROLE</TH>
          <TH w="90px" align="right">REP</TH>
          <TH>CAPABILITIES</TH>
          <TH w="140px">OWNER</TH>
          <TH w="40px" />
        </div>
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 50, borderBottom: `1px solid ${NT.border}`,
              background: i % 2 ? `rgba(255,255,255,0.01)` : "transparent",
              animation: "fadeSlideIn 0.3s ease" }} />
          ))
        ) : filtered.map((a, i) => {
          const rc = ROLES[a.role as keyof typeof ROLES] ?? { color: NT.cyan }
          const hasRep = a.repCount > 0
          const avg = hasRep ? a.repScore / a.repCount : 0
          return (
            <div key={a.id.toString()} style={{
              display: "flex", borderBottom: `1px solid ${NT.border}`,
              background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent",
              position: "relative",
            }}>
              <span style={{ position: "absolute", left: 0, top: 8, bottom: 8,
                width: 2, background: rc.color, opacity: 0.5 }} />
              <TD w="70px" style={{ color: NT.textMuted }}>#{a.id.toString()}</TD>
              <TD w="180px"><span style={{ fontFamily: "'Orbitron', monospace",
                fontWeight: 700, fontSize: 12, color: NT.text }}>{a.name}</span></TD>
              <TD w="120px"><RoleChip role={a.role} /></TD>
              <TD w="90px" align="right" style={{ justifyContent: "flex-end" }}>
                {hasRep ? (
                  <span style={{ fontFamily: "'Orbitron', monospace", fontWeight: 700,
                    color: avg >= 80 ? NT.green : NT.amber }}>{avg.toFixed(1)}</span>
                ) : <span style={{ color: NT.textMuted }}>—</span>}
              </TD>
              <TD>
                <div style={{ display: "flex", gap: 4, flexWrap: "nowrap", overflow: "hidden" }}>
                  {a.capabilities.slice(0, 4).map(c => (
                    <span key={c} style={{ fontSize: 9.5, padding: "2px 6px",
                      color: NT.textDim, border: `1px solid ${NT.border}`,
                      background: NT.surface2, whiteSpace: "nowrap" }}>{c}</span>
                  ))}
                </div>
              </TD>
              <TD w="140px"><Addr value={a.owner.slice(0,10) + "…" + a.owner.slice(-6)} /></TD>
              <TD w="40px" style={{ color: NT.textMuted }}>›</TD>
            </div>
          )
        })}
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${NT.border}`,
          display: "flex", justifyContent: "space-between",
          fontSize: 10, letterSpacing: "0.14em", color: NT.textMuted }}>
          <span>SHOWING {filtered.length} / {agents.length} · LAST 9000 BLOCKS</span>
        </div>
      </Panel>
    </PageShell>
  )
}
