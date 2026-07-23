"use client"
import { usePublicClient } from "wagmi"
import { useEffect, useState } from "react"
import PageShell from "@/components/PageShell"
import { Panel, RoleChip } from "@/components/atoms"
import { CONTRACTS, IDENTITY_ABI, REPUTATION_ABI } from "@/lib/arc"
import { NT, ROLES } from "@/lib/tokens"
import Link from "next/link"

const TRANSFER_EVENT = {
  type: "event" as const, name: "Transfer",
  inputs: [
    { type: "address" as const, name: "from", indexed: true },
    { type: "address" as const, name: "to", indexed: true },
    { type: "uint256" as const, name: "tokenId", indexed: true },
  ],
}

type Agent = {
  id: bigint; name: string; role: string; owner: string
  capabilities: string[]; repScore: number; repCount: number; avgRep: number
}

export default function LeaderboardPage() {
  const client = usePublicClient()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState<"rep"|"reviews">("rep")
  const [roleFilter, setRoleFilter] = useState("all")

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

        for (const log of mints) {
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
            if (repCount > 0) {
              loaded.push({
                id: tokenId, name: meta.name ?? "UNKNOWN", role: meta.role ?? "worker",
                owner: owner as string, capabilities: meta.capabilities ?? [],
                repScore, repCount, avgRep: repScore / repCount
              })
            }
          } catch {}
        }
        setAgents(loaded)
      } catch {}
      setLoading(false)
    }
    load()
  }, [client])

  const filtered = agents
    .filter(a => roleFilter === "all" || a.role === roleFilter)
    .sort((a, b) => sortBy === "rep" ? b.avgRep - a.avgRep : b.repCount - a.repCount)

  const medals = ["🥇", "🥈", "🥉"]

  return (
    <PageShell>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--green)" }}>▸ ./registry / leaderboard</div>
        <h1 style={{ margin: "6px 0 4px", fontFamily: "'Orbitron', monospace", fontSize: 24,
          fontWeight: 800, color: "var(--text)", textTransform: "uppercase" }}>
          Agent <span style={{ color: "var(--green)" }}>Leaderboard</span>
        </h1>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
          ERC-8004 reputation rankings · Last 9000 blocks
        </div>
      </div>

      {/* Top 3 podium */}
      {!loading && filtered.length >= 3 && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
          {filtered.slice(0, 3).map((agent, i) => {
            const rc = ROLES[agent.role as keyof typeof ROLES] ?? { color: "var(--cyan)" }
            return (
              <Link key={agent.id.toString()} href={"/agents/" + agent.id.toString()}
                style={{ textDecoration: "none" }}>
                <div style={{
                  padding: "20px 16px", textAlign: "center",
                  border: `1px solid ${i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : "#cd7f32"}`,
                  background: i === 0 ? "rgba(255,215,0,0.05)" : i === 1 ? "rgba(192,192,192,0.05)" : "rgba(205,127,50,0.05)",
                  position: "relative",
                }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>{medals[i]}</div>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13,
                    fontWeight: 700, color: "var(--text)", marginBottom: 4 }}>
                    {agent.name.slice(0, 12)}
                  </div>
                  <RoleChip role={agent.role} size={9} />
                  <div style={{ marginTop: 12, fontFamily: "'Orbitron', monospace",
                    fontSize: 28, fontWeight: 900, color: rc.color }}>
                    {agent.avgRep.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                    {agent.repCount} REVIEWS
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex" }}>
          {["all", "orchestrator", "worker", "evaluator"].map((r, i) => (
            <button key={r} onClick={() => setRoleFilter(r)} style={{
              padding: "8px 12px", cursor: "pointer",
              fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.1em",
              background: roleFilter === r ? "rgba(0,255,136,0.1)" : "var(--surface)",
              border: `1px solid ${roleFilter === r ? "var(--green)" : "var(--border)"}`,
              borderLeft: i === 0 ? `1px solid ${roleFilter === r ? "var(--green)" : "var(--border)"}` : "none",
              color: roleFilter === r ? "var(--green)" : "var(--text-muted)",
            }}>
              {r === "all" ? "ALL" : r.slice(0,4).toUpperCase()}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", marginLeft: "auto", gap: 4 }}>
          {[["rep", "BY SCORE"], ["reviews", "BY REVIEWS"]].map(([val, label]) => (
            <button key={val} onClick={() => setSortBy(val as any)} style={{
              padding: "8px 12px", cursor: "pointer",
              fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700,
              letterSpacing: "0.1em",
              background: sortBy === val ? "rgba(0,212,255,0.1)" : "var(--surface)",
              border: `1px solid ${sortBy === val ? "var(--cyan)" : "var(--border)"}`,
              color: sortBy === val ? "var(--cyan)" : "var(--text-muted)",
            }}>{label}</button>
          ))}
        </div>
      </div>

      {/* Table */}
      <Panel accent="var(--green)">
        <div style={{ display: "flex", background: "var(--surface2)",
          borderBottom: "1px solid var(--border-hi)" }}>
          <div style={{ width: 50, padding: "8px 14px", fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)" }}>RANK</div>
          <div style={{ flex: 1, padding: "8px 12px", fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)" }}>AGENT</div>
          <div style={{ width: 100, padding: "8px 12px", fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)" }}>ROLE</div>
          <div style={{ width: 80, padding: "8px 12px", fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", textAlign: "right" }}>SCORE</div>
          <div style={{ width: 80, padding: "8px 12px", fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", textAlign: "right" }}>REVIEWS</div>
          <div style={{ width: 80, padding: "8px 12px", fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", textAlign: "right" }}>ID</div>
        </div>

        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} style={{ height: 52, borderBottom: "1px solid var(--border)" }} />
          ))
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
            No agents with reputation found yet.
          </div>
        ) : filtered.map((agent, i) => {
          const rc = ROLES[agent.role as keyof typeof ROLES] ?? { color: "var(--cyan)" }
          const rankColor = i === 0 ? "#ffd700" : i === 1 ? "#c0c0c0" : i === 2 ? "#cd7f32" : "var(--text-muted)"
          return (
            <Link key={agent.id.toString()} href={"/agents/" + agent.id.toString()}
              style={{ display: "flex", borderBottom: "1px solid var(--border)",
                textDecoration: "none", alignItems: "center",
                background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent" }}>
              <div style={{ width: 50, padding: "12px 14px", fontSize: 14,
                color: rankColor, fontFamily: "'Orbitron', monospace", fontWeight: 700 }}>
                {i < 3 ? medals[i] : "#" + (i + 1)}
              </div>
              <div style={{ flex: 1, padding: "12px 12px" }}>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 12,
                  fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                  {agent.name}
                </div>
                <div style={{ fontSize: 9, color: "var(--text-muted)",
                  fontFamily: "'Space Mono', monospace" }}>
                  {agent.owner.slice(0,10)}...{agent.owner.slice(-6)}
                </div>
              </div>
              <div style={{ width: 100, padding: "12px 12px" }}>
                <RoleChip role={agent.role} size={9} />
              </div>
              <div style={{ width: 80, padding: "12px 12px", textAlign: "right",
                fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 700,
                color: agent.avgRep >= 80 ? "var(--green)" : "var(--amber)" }}>
                {agent.avgRep.toFixed(1)}
              </div>
              <div style={{ width: 80, padding: "12px 12px", textAlign: "right",
                color: "var(--text-dim)", fontSize: 12 }}>
                {agent.repCount}x
              </div>
              <div style={{ width: 80, padding: "12px 12px", textAlign: "right",
                color: "var(--text-muted)", fontSize: 11 }}>
                #{agent.id.toString()}
              </div>
            </Link>
          )
        })}

        <div style={{ padding: "10px 14px", borderTop: "1px solid var(--border)",
          fontSize: 9, letterSpacing: "0.14em", color: "var(--text-muted)" }}>
          {filtered.length} agents with reputation · ranked by {sortBy === "rep" ? "average score" : "review count"}
        </div>
      </Panel>
    </PageShell>
  )
}
