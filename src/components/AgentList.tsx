"use client"
import { usePublicClient } from "wagmi"
import { useEffect, useState } from "react"
import { CONTRACTS, IDENTITY_ABI, REPUTATION_ABI } from "@/lib/arc"
import { NT } from "@/lib/tokens"

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

const roleColors: Record<string, { bg: string, text: string }> = {
  orchestrator: { bg: "rgba(0,255,136,0.08)", text: NT.green },
  worker:       { bg: "rgba(0,212,255,0.08)", text: NT.cyan },
  evaluator:    { bg: "rgba(255,181,71,0.08)", text: NT.amber },
}

export default function AgentList() {
  const client = usePublicClient()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

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
        for (const log of mints.slice(-20)) {
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
            if (!meta.name) continue  // metadata yüklenmediyse atla
          loaded.push({ id: tokenId, owner: owner as string, name: meta.name, role: meta.role ?? "worker", capabilities: meta.capabilities ?? [], repScore, repCount })
          } catch {}
        }
        setAgents(loaded.reverse())
      } catch {}
      setLoading(false)
    }
    load()
  }, [client])

  const filtered = filter === "all" ? agents : agents.filter(a => a.role === filter)

  return (
    <div style={{ border: `1px solid ${NT.border}`, background: NT.surface }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", borderBottom: `1px solid ${NT.border}`, background: NT.surface2,
        flexWrap: "wrap", gap: 8 }}>
        <span style={{ fontSize: 10, letterSpacing: "0.2em", color: NT.green, fontWeight: 700 }}>
          ▸ REGISTERED AGENTS
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          {["all", "orchestrator", "worker", "evaluator"].map(r => (
            <button key={r} onClick={() => setFilter(r)} style={{
              padding: "3px 8px", fontSize: 9, letterSpacing: "0.1em", fontWeight: 700,
              background: filter === r ? `${NT.green}14` : "transparent",
              border: `1px solid ${filter === r ? NT.green + "66" : NT.border}`,
              color: filter === r ? NT.green : NT.textMuted,
              cursor: "pointer", fontFamily: "'Space Mono', monospace",
            }}>
              {r === "all" ? "ALL" : r === "orchestrator" ? "ORCH" : r === "worker" ? "WRKR" : "EVAL"}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        Array.from({ length: 6 }).map((_, i) => (
          <div key={i} style={{ height: 56, borderBottom: `1px solid ${NT.border}`,
            background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent" }} />
        ))
      ) : filtered.length === 0 ? (
        <div style={{ padding: 40, textAlign: "center", color: NT.textMuted, fontSize: 11 }}>
          NO AGENTS FOUND
        </div>
      ) : filtered.map((agent, i) => {
        const rc = roleColors[agent.role] ?? { bg: "transparent", text: NT.cyan }
        const hasRep = agent.repCount > 0
        const avg = hasRep ? agent.repScore / agent.repCount : 0
        return (
          <div key={agent.id.toString()} style={{
            padding: "10px 16px", borderBottom: `1px solid ${NT.border}`,
            background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent",
            position: "relative", display: "flex", alignItems: "center",
            justifyContent: "space-between", gap: 8,
          }}>
            <span style={{ position: "absolute", left: 0, top: 8, bottom: 8,
              width: 2, background: rc.text, opacity: 0.5 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6,
                flexWrap: "wrap", marginBottom: 4 }}>
                <span style={{ color: NT.textMuted, fontSize: 10,
                  fontFamily: "'Space Mono', monospace" }}>
                  #{agent.id.toString()}
                </span>
                <span style={{ fontSize: 9, padding: "1px 5px",
                  background: rc.bg, color: rc.text,
                  border: `1px solid ${rc.text}44`, letterSpacing: "0.1em" }}>
                  {agent.role.slice(0, 4).toUpperCase()}
                </span>
                <span style={{ color: NT.text, fontSize: 12,
                  fontFamily: "'Orbitron', monospace", fontWeight: 700 }}>
                  {agent.name}
                </span>
              </div>
              <div style={{ display: "flex", gap: 3, flexWrap: "wrap" }}>
                {agent.capabilities.slice(0, 4).map(cap => (
                  <span key={cap} style={{ fontSize: 9, padding: "1px 5px",
                    background: NT.surface2, color: NT.textMuted,
                    border: `1px solid ${NT.border}` }}>
                    {cap}
                  </span>
                ))}
              </div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              {hasRep ? (
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 16,
                  fontWeight: 700, color: avg >= 80 ? NT.green : NT.amber,
                  lineHeight: 1 }}>
                  {avg.toFixed(0)}
                </div>
              ) : (
                <div style={{ color: NT.textMuted, fontSize: 10 }}>—</div>
              )}
              <a href={`https://testnet.arcscan.app/token/${CONTRACTS.IDENTITY_REGISTRY}/instance/${agent.id}`}
                target="_blank" rel="noreferrer"
                style={{ color: NT.textMuted, fontSize: 9, textDecoration: "none" }}>↗</a>
            </div>
          </div>
        )
      })}
    </div>
  )
}
