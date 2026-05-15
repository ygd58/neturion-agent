"use client"
import { usePublicClient, useAccount } from "wagmi"
import { useEffect, useState } from "react"
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
  id: bigint; name: string; role: string
  capabilities: string[]; repScore: number; repCount: number
}

export default function MyAgents() {
  const { address, isConnected } = useAccount()
  const client = usePublicClient()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!client || !address || !isConnected) return
    setLoading(true)
    async function load() {
      try {
        const latest = await (client as any).getBlockNumber()
        const fromBlock = latest > 9000n ? latest - 9000n : 0n
        const logs = await (client as any).getLogs({
          address: CONTRACTS.IDENTITY_REGISTRY,
          event: TRANSFER_EVENT, fromBlock, toBlock: latest,
        })
        const mine = logs.filter((l: any) =>
          l.args?.to?.toLowerCase() === address.toLowerCase() &&
          l.args?.from === "0x0000000000000000000000000000000000000000"
        )
        const loaded: Agent[] = []
        for (const log of mine) {
          const tokenId = log.args?.tokenId as bigint
          if (!tokenId) continue
          try {
            const uri = await (client as any).readContract({
              address: CONTRACTS.IDENTITY_REGISTRY, abi: IDENTITY_ABI,
              functionName: "tokenURI", args: [tokenId],
            })
            let meta: any = {}
            try { meta = JSON.parse(Buffer.from((uri as string).replace("data:application/json;base64,", ""), "base64").toString()) } catch {}
            let repScore = 0, repCount = 0
            try {
              const rep = await (client as any).readContract({
                address: CONTRACTS.REPUTATION_REGISTRY, abi: REPUTATION_ABI,
                functionName: "getReputation", args: [tokenId],
              }) as [bigint, bigint]
              repScore = Number(rep[0]); repCount = Number(rep[1])
            } catch {}
            loaded.push({ id: tokenId, name: meta.name ?? "UNKNOWN", role: meta.role ?? "worker", capabilities: meta.capabilities ?? [], repScore, repCount })
          } catch {}
        }
        setAgents(loaded)
      } catch {}
      setLoading(false)
    }
    load()
  }, [client, address, isConnected])

  if (!isConnected) return null

  return (
    <div style={{ border: `1px solid ${NT.green}44`, background: "rgba(0,255,136,0.02)", marginBottom: 14 }}>
      <div style={{ padding: "10px 14px", borderBottom: `1px solid ${NT.green}33`,
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 10, letterSpacing: "0.2em", color: NT.green, fontWeight: 700 }}>
          ▸ MY AGENTS
        </span>
        <Link href="/register" style={{
          fontSize: 9, letterSpacing: "0.14em", color: NT.green,
          textDecoration: "none", padding: "3px 8px",
          border: `1px solid ${NT.green}44`,
        }}>+ REGISTER NEW</Link>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: "center", color: NT.textMuted, fontSize: 10 }}>
          LOADING...
        </div>
      ) : agents.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center" }}>
          <p style={{ color: NT.textMuted, fontSize: 11, marginBottom: 12 }}>
            You have no agents registered in the last 9000 blocks
          </p>
          <Link href="/register" style={{
            padding: "8px 16px", background: `${NT.green}14`,
            border: `1px solid ${NT.green}66`, color: NT.green,
            textDecoration: "none", fontSize: 10, letterSpacing: "0.14em",
            fontFamily: "'Space Mono', monospace",
          }}>
            ▸ REGISTER YOUR FIRST AGENT
          </Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, padding: 14 }}>
          {agents.map(agent => {
            const rc = ROLES[agent.role as keyof typeof ROLES] ?? { color: NT.cyan }
            const hasRep = agent.repCount > 0
            const avg = hasRep ? agent.repScore / agent.repCount : 0
            return (
              <Link key={agent.id.toString()} href={`/agents/${agent.id.toString()}`}
                style={{ textDecoration: "none", flex: "1 1 200px", minWidth: 0 }}>
                <div style={{ padding: "12px 14px", border: `1px solid ${rc.color}44`,
                  background: `${rc.color}08`, position: "relative" }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "flex-start", marginBottom: 6 }}>
                    <div>
                      <div style={{ fontSize: 9, color: NT.textMuted, marginBottom: 3 }}>
                        #{agent.id.toString()}
                      </div>
                      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13,
                        fontWeight: 700, color: NT.text }}>{agent.name}</div>
                    </div>
                    <span style={{ fontSize: 9, padding: "2px 6px",
                      background: `${rc.color}14`, color: rc.color,
                      border: `1px solid ${rc.color}44`, letterSpacing: "0.1em" }}>
                      {agent.role.slice(0, 4).toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    alignItems: "center" }}>
                    <div style={{ display: "flex", gap: 3 }}>
                      {agent.capabilities.slice(0, 2).map(c => (
                        <span key={c} style={{ fontSize: 8, padding: "1px 4px",
                          background: NT.surface2, color: NT.textMuted,
                          border: `1px solid ${NT.border}` }}>{c}</span>
                      ))}
                    </div>
                    {hasRep && (
                      <span style={{ fontFamily: "'Orbitron', monospace",
                        fontSize: 14, fontWeight: 700,
                        color: avg >= 80 ? NT.green : NT.amber }}>
                        {avg.toFixed(0)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
