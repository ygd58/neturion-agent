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
  const [sortBy, setSortBy] = useState("id")

  useEffect(() => {
    if (!client) return
    async function load() {
      try {
        const latest = await (client as any).getBlockNumber()
        const fromBlock = latest > 9000n ? latest - 9000n : 0n
        const logs = await (client as any).getLogs({
          address: CONTRACTS.IDENTITY_REGISTRY,
          event: TRANSFER_EVENT, fromBlock, toBlock: latest,
        })
        const mints = logs.filter((l: any) => l.args?.from === "0x0000000000000000000000000000000000000000")
        const loaded: Agent[] = []
        for (const log of mints.slice(-50)) {
          const tokenId = log.args?.tokenId as bigint
          if (!tokenId) continue
          try {
            const [owner, uri] = await Promise.all([
              (client as any).readContract({ address: CONTRACTS.IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "ownerOf", args: [tokenId] }),
              (client as any).readContract({ address: CONTRACTS.IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "tokenURI", args: [tokenId] }),
            ])
            let meta: any = {}
            try { meta = JSON.parse(Buffer.from((uri as string).replace("data:application/json;base64,", ""), "base64").toString()) } catch {}
            let repScore = 0, repCount = 0
            try {
              const rep = await (client as any).readContract({ address: CONTRACTS.REPUTATION_REGISTRY, abi: REPUTATION_ABI, functionName: "getReputation", args: [tokenId] }) as [bigint, bigint]
              repScore = Number(rep[0]); repCount = Number(rep[1])
            } catch {}
            loaded.push({ id: tokenId, owner: owner as string, name: meta.name ?? "UNKNOWN", role: meta.role ?? "worker", capabilities: meta.capabilities ?? [], repScore, repCount })
          } catch {}
        }
        setAgents(loaded.reverse())
      } catch {}
      setLoading(false)
    }
    load()
  }, [client])

  const counts = {
    ALL: agents.length,
    ORCH: agents.filter(a => a.role === "orchestrator").length,
    WRKR: agents.filter(a => a.role === "worker").length,
    EVAL: agents.filter(a => a.role === "evaluator").length,
  }

  const filtered = agents
    .filter(a => {
      const roleMatch = filter === "ALL" ||
        (filter === "ORCH" && a.role === "orchestrator") ||
        (filter === "WRKR" && a.role === "worker") ||
        (filter === "EVAL" && a.role === "evaluator")
      const q = search.toLowerCase()
      const searchMatch = !q ||
        a.name.toLowerCase().includes(q) ||
        a.id.toString().includes(q) ||
        a.owner.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.capabilities.some(c => c.toLowerCase().includes(q))
      return roleMatch && searchMatch
    })
    .sort((a, b) => {
      if (sortBy === "rep") {
        const avgA = a.repCount > 0 ? a.repScore / a.repCount : 0
        const avgB = b.repCount > 0 ? b.repScore / b.repCount : 0
        return avgB - avgA
      }
      if (sortBy === "id") return Number(b.id - a.id)
      return a.name.localeCompare(b.name)
    })

  return (
    <PageShell>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.32em", color: NT.green }}>▸ ./registry / agents</div>
        <h1 style={{ margin: "6px 0 4px", fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 800, letterSpacing: "0.08em", color: NT.text, textTransform: "uppercase" }}>
          Agent <span style={{ color: NT.green }}>Registry</span>
        </h1>
        <div style={{ fontSize: 10, letterSpacing: "0.1em", color: NT.textDim }}>
          ERC-8004 · {CONTRACTS.IDENTITY_REGISTRY.slice(0,16)}...
        </div>
      </div>

      {/* Leaderboard link */}
      <div style={{ marginBottom: 10 }}>
        <a href="/leaderboard" style={{
          display: "inline-flex", alignItems: "center", gap: 6,
          padding: "8px 14px", fontSize: 10, letterSpacing: "0.14em",
          color: "var(--amber)", border: "1px solid var(--amber)44",
          background: "rgba(255,181,71,0.06)", textDecoration: "none",
          fontFamily: "'Space Mono', monospace", fontWeight: 700,
        }}>🏆 VIEW LEADERBOARD →</a>
      </div>

      {/* Search bar */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10,
        background: NT.surface, border: `1px solid ${NT.border}`, padding: "0 14px" }}>
        <span style={{ color: NT.green, fontSize: 14 }}>⌕</span>
        <input
          placeholder="Search by name, ID, address, capability..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ background: "transparent", border: "none", color: NT.text,
            fontFamily: "'Space Mono', monospace", fontSize: 12, letterSpacing: "0.04em",
            outline: "none", flex: 1, padding: "12px 0" }}
        />
        {search && (
          <button onClick={() => setSearch("")} style={{ background: "transparent",
            border: "none", color: NT.textMuted, cursor: "pointer", fontSize: 16 }}>×</button>
        )}
      </div>

      {/* Filters + Sort */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex" }}>
          {Object.entries(counts).map(([k, v], i) => (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: "8px 12px", cursor: "pointer",
              fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
              letterSpacing: "0.12em",
              background: filter === k ? `${NT.green}14` : NT.surface,
              border: `1px solid ${filter === k ? NT.green + "66" : NT.border}`,
              borderLeft: i === 0 ? `1px solid ${filter === k ? NT.green + "66" : NT.border}` : "none",
              color: filter === k ? NT.green : NT.textMuted,
            }}>
              {k} <span style={{ fontSize: 9 }}>{v}</span>
            </button>
          ))}
        </div>

        <div style={{ display: "flex", marginLeft: "auto", gap: 4 }}>
          {[["id", "NEWEST"], ["name", "NAME"], ["rep", "REP ↓"]].map(([val, label]) => (
            <button key={val} onClick={() => setSortBy(val)} style={{
              padding: "8px 10px", cursor: "pointer",
              fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.1em",
              background: sortBy === val ? `${NT.cyan}14` : NT.surface,
              border: `1px solid ${sortBy === val ? NT.cyan + "66" : NT.border}`,
              color: sortBy === val ? NT.cyan : NT.textMuted,
            }}>
              {label}
            </button>
          ))}
        </div>

        <Link href="/register" style={{
          padding: "8px 14px", background: `${NT.green}14`,
          border: `1px solid ${NT.green}66`, color: NT.green,
          fontFamily: "'Space Mono', monospace", fontSize: 10,
          fontWeight: 700, letterSpacing: "0.12em", textDecoration: "none",
          display: "flex", alignItems: "center",
        }}>+ REGISTER</Link>
      </div>

      {/* Results count */}
      {search && (
        <div style={{ fontSize: 10, color: NT.textMuted, letterSpacing: "0.12em",
          marginBottom: 8, padding: "6px 12px", background: NT.surface2,
          border: `1px solid ${NT.border}` }}>
          {filtered.length} result{filtered.length !== 1 ? "s" : ""} for "{search}"
        </div>
      )}

      {/* Table */}
      <Panel accent={NT.green} style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", background: NT.surface2, borderBottom: `1px solid ${NT.borderHi}`, overflowX: "auto" }}>
          <TH w="70px">ID</TH>
          <TH w="160px">NAME</TH>
          <TH w="110px">ROLE</TH>
          <TH w="80px" align="right">REP</TH>
          <TH>CAPABILITIES</TH>
          <TH w="130px">OWNER</TH>
          <TH w="30px" />
        </div>

        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 48, borderBottom: `1px solid ${NT.border}`,
              background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent" }} />
          ))
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: NT.textMuted, fontSize: 11 }}>
            {search ? `No agents found for "${search}"` : "No agents found"}
          </div>
        ) : filtered.map((a, i) => {
          const rc = ROLES[a.role as keyof typeof ROLES] ?? { color: NT.cyan }
          const hasRep = a.repCount > 0
          const avg = hasRep ? a.repScore / a.repCount : 0
          return (
            <Link key={a.id.toString()} href={`/agents/${a.id.toString()}`}
              style={{ display: "flex", borderBottom: `1px solid ${NT.border}`,
                background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent",
                position: "relative", textDecoration: "none" }}>
              <span style={{ position: "absolute", left: 0, top: 8, bottom: 8,
                width: 2, background: rc.color, opacity: 0.5 }} />
              <TD w="70px" style={{ color: NT.textMuted, fontSize: 10 }}>#{a.id.toString()}</TD>
              <TD w="160px">
                <span style={{ fontFamily: "'Orbitron', monospace", fontWeight: 700,
                  fontSize: 11, color: NT.text }}>
                  {a.name.slice(0, 14)}
                </span>
              </TD>
              <TD w="110px"><RoleChip role={a.role} /></TD>
              <TD w="80px" align="right" style={{ justifyContent: "flex-end" }}>
                {hasRep ? (
                  <span style={{ fontFamily: "'Orbitron', monospace", fontWeight: 700,
                    color: avg >= 80 ? NT.green : NT.amber, fontSize: 13 }}>
                    {avg.toFixed(1)}
                  </span>
                ) : <span style={{ color: NT.textMuted }}>—</span>}
              </TD>
              <TD>
                <div style={{ display: "flex", gap: 3, flexWrap: "nowrap", overflow: "hidden" }}>
                  {a.capabilities.slice(0, 3).map(c => (
                    <span key={c} style={{ fontSize: 9, padding: "1px 5px",
                      color: NT.textDim, border: `1px solid ${NT.border}`,
                      background: NT.surface2, whiteSpace: "nowrap" }}>{c}</span>
                  ))}
                </div>
              </TD>
              <TD w="130px">
                <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 10,
                  color: NT.textDim }}>
                  {a.owner.slice(0,8)}…{a.owner.slice(-4)}
                </span>
              </TD>
              <TD w="30px" style={{ color: NT.textMuted }}>›</TD>
            </Link>
          )
        })}

        <div style={{ padding: "10px 14px", borderTop: `1px solid ${NT.border}`,
          display: "flex", justifyContent: "space-between", alignItems: "center",
          fontSize: 9, letterSpacing: "0.14em", color: NT.textMuted }}>
          <span>SHOWING {filtered.length} / {agents.length} · LAST 9000 BLOCKS</span>
          {search && <button onClick={() => setSearch("")} style={{ background: "transparent",
            border: `1px solid ${NT.border}`, color: NT.textMuted, cursor: "pointer",
            padding: "3px 8px", fontSize: 9, fontFamily: "'Space Mono', monospace" }}>
            CLEAR SEARCH
          </button>}
        </div>
      </Panel>
    </PageShell>
  )
}
