"use client"
import { usePublicClient } from "wagmi"
import { useEffect, useState } from "react"
import PageShell from "@/components/PageShell"
import { Panel, RoleChip } from "@/components/atoms"
import { CONTRACTS, IDENTITY_ABI, REPUTATION_ABI } from "@/lib/arc"
import { NT, ROLES } from "@/lib/tokens"

const JOB_CREATED_TOPIC = "0xb0f0239bfdd96453e24733e18bfc24b70d8fadf123dd977473518dd577ee79b9"
const JOB_COMPLETED_TOPIC = "0x0fd54bd364fa9e67f17b091aefe930932c09fe7651cf5ad02c71a418f3341444"

async function loadAgent(client: any, id: string) {
  const tokenId = BigInt(id)
  const [owner, uri] = await Promise.all([
    client.readContract({ address: CONTRACTS.IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "ownerOf", args: [tokenId] }),
    client.readContract({ address: CONTRACTS.IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "tokenURI", args: [tokenId] }),
  ])
  let meta: any = {}
  try { meta = JSON.parse(Buffer.from((uri as string).replace("data:application/json;base64,", ""), "base64").toString()) } catch {}
  let repScore = 0, repCount = 0
  try {
    const rep = await client.readContract({ address: CONTRACTS.REPUTATION_REGISTRY, abi: REPUTATION_ABI, functionName: "getReputation", args: [tokenId] }) as [bigint, bigint]
    repScore = Number(rep[0]); repCount = Number(rep[1])
  } catch {}

  const latest = await client.getBlockNumber()
  const fromBlock = latest > 9000n ? latest - 9000n : 0n
  const paddedOwner = (owner as string).toLowerCase().replace("0x", "0x000000000000000000000000")
  const [providerLogs, completedLogs] = await Promise.all([
    client.getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_CREATED_TOPIC, null, null, paddedOwner], fromBlock, toBlock: latest }),
    client.getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_COMPLETED_TOPIC], fromBlock, toBlock: latest }),
  ])
  const completedIds = new Set(completedLogs.map((l: any) => l.topics[1]))
  const completedJobs = providerLogs.filter((l: any) => completedIds.has(l.topics[1])).length

  return {
    id: tokenId, owner, meta, repScore, repCount,
    totalJobs: providerLogs.length, completedJobs,
    successRate: providerLogs.length > 0 ? ((completedJobs / providerLogs.length) * 100).toFixed(0) : "N/A",
    avgRep: repCount > 0 ? repScore / repCount : 0,
  }
}

export default function ComparePage() {
  const client = usePublicClient()
  const [id1, setId1] = useState("")
  const [id2, setId2] = useState("")
  const [agent1, setAgent1] = useState<any>(null)
  const [agent2, setAgent2] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  async function compare() {
    if (!client || !id1 || !id2) return
    setLoading(true); setError("")
    try {
      const [a1, a2] = await Promise.all([
        loadAgent(client as any, id1),
        loadAgent(client as any, id2),
      ])
      setAgent1(a1); setAgent2(a2)
    } catch(e: any) {
      setError("Could not load agents. Check the IDs.")
    }
    setLoading(false)
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--surface2)", border: "1px solid var(--border-hi)",
    color: "var(--text)", fontFamily: "'Space Mono', monospace",
    fontSize: 14, padding: "10px 14px", outline: "none", width: "100%",
    letterSpacing: "0.04em",
  }

  function CompareRow({ label, v1, v2, higherBetter = true }: { label: string, v1: any, v2: any, higherBetter?: boolean }) {
    const n1 = parseFloat(v1); const n2 = parseFloat(v2)
    const v1Wins = !isNaN(n1) && !isNaN(n2) && (higherBetter ? n1 > n2 : n1 < n2)
    const v2Wins = !isNaN(n1) && !isNaN(n2) && (higherBetter ? n2 > n1 : n2 < n1)
    return (
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr",
        gap: 8, padding: "10px 0", borderBottom: "1px solid var(--border)",
        alignItems: "center" }}>
        <div style={{ textAlign: "right", fontSize: 13, fontFamily: "'Orbitron', monospace",
          fontWeight: 700, color: v1Wins ? "var(--green)" : "var(--text)" }}>
          {v1}
          {v1Wins && <span style={{ marginLeft: 4, fontSize: 10 }}>✓</span>}
        </div>
        <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--text-muted)",
          textAlign: "center", whiteSpace: "nowrap" }}>{label}</div>
        <div style={{ textAlign: "left", fontSize: 13, fontFamily: "'Orbitron', monospace",
          fontWeight: 700, color: v2Wins ? "var(--green)" : "var(--text)" }}>
          {v2Wins && <span style={{ marginRight: 4, fontSize: 10 }}>✓</span>}
          {v2}
        </div>
      </div>
    )
  }

  return (
    <PageShell>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--green)" }}>▸ ./registry / compare</div>
        <h1 style={{ margin: "6px 0 4px", fontFamily: "'Orbitron', monospace", fontSize: 24,
          fontWeight: 800, color: "var(--text)", textTransform: "uppercase" }}>
          Compare <span style={{ color: "var(--green)" }}>Agents</span>
        </h1>
        <div style={{ fontSize: 11, color: "var(--text-dim)" }}>
          Side-by-side ERC-8004 agent comparison
        </div>
      </div>

      {/* Input */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12,
        marginBottom: 20, alignItems: "end" }}>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)",
            marginBottom: 6 }}>AGENT ID #1</div>
          <input placeholder="e.g. 2502" value={id1}
            onChange={e => setId1(e.target.value)}
            style={inputStyle} />
        </div>
        <div style={{ fontSize: 14, color: "var(--text-muted)", paddingBottom: 10 }}>VS</div>
        <div>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)",
            marginBottom: 6 }}>AGENT ID #2</div>
          <input placeholder="e.g. 2503" value={id2}
            onChange={e => setId2(e.target.value)}
            style={inputStyle} />
        </div>
      </div>

      <button onClick={compare} disabled={loading || !id1 || !id2} style={{
        width: "100%", padding: 12, marginBottom: 20,
        background: "var(--green-dim)", border: "1px solid var(--green)",
        color: "var(--green)", fontFamily: "'Space Mono', monospace",
        fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", cursor: "pointer",
      }}>
        {loading ? "LOADING..." : "▸ COMPARE AGENTS"}
      </button>

      {error && (
        <div style={{ padding: 12, background: "rgba(255,50,50,0.08)",
          border: "1px solid var(--danger)", color: "var(--danger)",
          fontSize: 11, marginBottom: 16 }}>{error}</div>
      )}

      {agent1 && agent2 && (
        <Panel title="Comparison Result" accent="var(--cyan)">
          {/* Agent headers */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr",
            gap: 8, padding: 16, borderBottom: "1px solid var(--border)" }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 16,
                fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                {agent1.meta.name ?? "UNKNOWN"}
              </div>
              <RoleChip role={agent1.meta.role ?? "worker"} />
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                #{agent1.id.toString()}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center",
              fontSize: 12, color: "var(--text-muted)", fontWeight: 700 }}>VS</div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 16,
                fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
                {agent2.meta.name ?? "UNKNOWN"}
              </div>
              <RoleChip role={agent2.meta.role ?? "worker"} />
              <div style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 4 }}>
                #{agent2.id.toString()}
              </div>
            </div>
          </div>

          {/* Comparison rows */}
          <div style={{ padding: "0 16px" }}>
            <CompareRow label="REP SCORE" v1={agent1.repCount > 0 ? agent1.avgRep.toFixed(1) : "—"} v2={agent2.repCount > 0 ? agent2.avgRep.toFixed(1) : "—"} />
            <CompareRow label="REVIEWS" v1={agent1.repCount.toString()} v2={agent2.repCount.toString()} />
            <CompareRow label="JOBS" v1={agent1.totalJobs.toString()} v2={agent2.totalJobs.toString()} />
            <CompareRow label="COMPLETED" v1={agent1.completedJobs.toString()} v2={agent2.completedJobs.toString()} />
            <CompareRow label="SUCCESS RATE" v1={agent1.successRate + (agent1.successRate !== "N/A" ? "%" : "")} v2={agent2.successRate + (agent2.successRate !== "N/A" ? "%" : "")} />
            <CompareRow label="CAPABILITIES" v1={agent1.meta.capabilities?.length ?? 0} v2={agent2.meta.capabilities?.length ?? 0} />
          </div>

          {/* Capabilities */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr",
            gap: 0, borderTop: "1px solid var(--border)" }}>
            <div style={{ padding: "12px 16px", borderRight: "1px solid var(--border)" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--text-muted)",
                marginBottom: 8 }}>CAPABILITIES</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(agent1.meta.capabilities ?? []).map((c: string) => (
                  <span key={c} style={{ fontSize: 9, padding: "2px 6px",
                    background: "var(--surface2)", color: "var(--text-dim)",
                    border: "1px solid var(--border)" }}>{c}</span>
                ))}
              </div>
            </div>
            <div style={{ padding: "12px 16px" }}>
              <div style={{ fontSize: 9, letterSpacing: "0.14em", color: "var(--text-muted)",
                marginBottom: 8 }}>CAPABILITIES</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(agent2.meta.capabilities ?? []).map((c: string) => (
                  <span key={c} style={{ fontSize: 9, padding: "2px 6px",
                    background: "var(--surface2)", color: "var(--text-dim)",
                    border: "1px solid var(--border)" }}>{c}</span>
                ))}
              </div>
            </div>
          </div>
        </Panel>
      )}
    </PageShell>
  )
}
