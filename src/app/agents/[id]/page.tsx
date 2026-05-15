"use client"
import { usePublicClient } from "wagmi"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import PageShell from "@/components/PageShell"
import { Panel, RoleChip, StatusPill } from "@/components/atoms"
import { CONTRACTS, IDENTITY_ABI, REPUTATION_ABI } from "@/lib/arc"
import { NT, ROLES } from "@/lib/tokens"
import Link from "next/link"

const JOB_CREATED_TOPIC = "0xb0f0239bfdd96453e24733e18bfc24b70d8fadf123dd977473518dd577ee79b9"
const JOB_COMPLETED_TOPIC = "0x0fd54bd364fa9e67f17b091aefe930932c09fe7651cf5ad02c71a418f3341444"

export default function AgentDetailPage() {
  const { id } = useParams()
  const client = usePublicClient()
  const [agent, setAgent] = useState<any>(null)
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!client || !id) return
    async function load() {
      try {
        const tokenId = BigInt(id as string)
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

        setAgent({ id: tokenId, owner, meta, repScore, repCount })

        // Job history
        const latest = await (client as any).getBlockNumber()
        const fromBlock = latest > 9000n ? latest - 9000n : 0n
        const paddedOwner = (owner as string).toLowerCase().replace("0x", "0x000000000000000000000000")
        
        const [asProvider, asClient] = await Promise.all([
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_CREATED_TOPIC, null, null, paddedOwner], fromBlock, toBlock: latest }),
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_CREATED_TOPIC, null, paddedOwner], fromBlock, toBlock: latest }),
        ])
        const completedLogs = await (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_COMPLETED_TOPIC], fromBlock, toBlock: latest })
        const completedIds = new Set(completedLogs.map((l: any) => l.topics[1]))

        const allJobs = [...asProvider.map((l: any) => ({ ...l, role: "provider" })), ...asClient.map((l: any) => ({ ...l, role: "client" }))]
          .map((l: any) => ({
            id: l.topics[1] ? BigInt(l.topics[1]).toString() : "?",
            role: l.role,
            status: completedIds.has(l.topics[1]) ? "COMPLETED" : "OPEN",
            block: l.blockNumber?.toString() ?? "?",
            tx: l.transactionHash?.slice(0, 14) + "..." ?? "",
          }))

        setJobs(allJobs)
      } catch(e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [client, id])

  if (loading) return (
    <PageShell>
      <div style={{ padding: 40, textAlign: "center", color: NT.textMuted, fontSize: 11, letterSpacing: "0.14em" }}>
        LOADING AGENT #{id}...
      </div>
    </PageShell>
  )

  if (!agent) return (
    <PageShell>
      <div style={{ padding: 40, textAlign: "center", color: NT.danger, fontSize: 11 }}>
        AGENT NOT FOUND
      </div>
    </PageShell>
  )

  const rc = ROLES[agent.meta.role as keyof typeof ROLES] ?? { color: NT.cyan, glyph: "●", short: "UNKN" }
  const hasRep = agent.repCount > 0
  const avg = hasRep ? agent.repScore / agent.repCount : 0

  return (
    <PageShell>
      <div style={{ marginBottom: 16 }}>
        <Link href="/agents" style={{ color: NT.textMuted, fontSize: 10, letterSpacing: "0.14em",
          textDecoration: "none" }}>← AGENTS</Link>
        <div style={{ fontSize: 10, letterSpacing: "0.32em", color: NT.green, marginTop: 8 }}>
          ▸ ./registry / agent / #{id}
        </div>
        <h1 style={{ margin: "6px 0 0", fontFamily: "'Orbitron', monospace",
          fontSize: 28, fontWeight: 800, letterSpacing: "0.08em",
          color: NT.text, textTransform: "uppercase" }}>
          {agent.meta.name ?? "UNKNOWN"}
        </h1>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Identity */}
        <Panel title="ERC-8004 Identity" accent={NT.green}>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Agent ID", `#${agent.id.toString()}`],
              ["Name", agent.meta.name ?? "—"],
              ["Role", agent.meta.role ?? "—"],
              ["Version", agent.meta.version ?? "—"],
              ["Owner", agent.owner],
              ["Network", agent.meta.network ?? "Arc Testnet"],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between",
                gap: 8, borderBottom: `1px solid ${NT.border}`, paddingBottom: 8 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.14em", color: NT.textMuted }}>{k}</span>
                <span style={{ fontSize: 11, color: NT.text, fontFamily: "'Space Mono', monospace",
                  wordBreak: "break-all", textAlign: "right" }}>{v}</span>
              </div>
            ))}
            <div>
              <div style={{ fontSize: 10, letterSpacing: "0.14em", color: NT.textMuted, marginBottom: 6 }}>
                CAPABILITIES
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                {(agent.meta.capabilities ?? []).map((cap: string) => (
                  <span key={cap} style={{ fontSize: 10, padding: "2px 8px",
                    background: NT.surface2, color: NT.textDim,
                    border: `1px solid ${NT.border}` }}>{cap}</span>
                ))}
              </div>
            </div>
          </div>
        </Panel>

        {/* Reputation */}
        <Panel title="ERC-8004 Reputation" accent={NT.amber}>
          <div style={{ padding: 16 }}>
            {hasRep ? (
              <div style={{ textAlign: "center", padding: "20px 0" }}>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 56,
                  fontWeight: 900, color: avg >= 80 ? NT.green : NT.amber,
                  textShadow: `0 0 20px ${avg >= 80 ? NT.green : NT.amber}44`,
                  lineHeight: 1 }}>
                  {avg.toFixed(1)}
                </div>
                <div style={{ color: NT.textMuted, fontSize: 10,
                  letterSpacing: "0.2em", marginTop: 8 }}>
                  AVG SCORE
                </div>
                <div style={{ marginTop: 16, display: "flex",
                  justifyContent: "center", gap: 24 }}>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Orbitron', monospace",
                      fontSize: 20, color: NT.text }}>{agent.repScore}</div>
                    <div style={{ fontSize: 9, color: NT.textMuted,
                      letterSpacing: "0.14em" }}>TOTAL SCORE</div>
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontFamily: "'Orbitron', monospace",
                      fontSize: 20, color: NT.text }}>{agent.repCount}</div>
                    <div style={{ fontSize: 9, color: NT.textMuted,
                      letterSpacing: "0.14em" }}>REVIEWS</div>
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ color: NT.textMuted, fontSize: 11,
                  letterSpacing: "0.14em", marginBottom: 8 }}>
                  NO REPUTATION YET
                </div>
                <div style={{ color: NT.textMuted, fontSize: 10, lineHeight: 1.6 }}>
                  Complete jobs to earn reputation scores from evaluators
                </div>
              </div>
            )}
          </div>
        </Panel>
      </div>

      {/* Job History */}
      <Panel title={`Job History · ${jobs.length} jobs`} accent={NT.cyan}>
        {jobs.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center",
            color: NT.textMuted, fontSize: 11 }}>
            NO JOBS IN LAST 9000 BLOCKS
          </div>
        ) : (
          <div>
            <div style={{ display: "flex", background: NT.surface2,
              borderBottom: `1px solid ${NT.border}` }}>
              {["JOB ID", "ROLE", "STATUS", "BLOCK", "TX"].map(h => (
                <div key={h} style={{ flex: h === "TX" ? 2 : 1, padding: "8px 12px",
                  fontSize: 9, letterSpacing: "0.2em", color: NT.textMuted,
                  fontWeight: 700 }}>{h}</div>
              ))}
            </div>
            {jobs.map((job, i) => (
              <div key={i} style={{ display: "flex", borderBottom: `1px solid ${NT.border}`,
                background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent" }}>
                <div style={{ flex: 1, padding: "10px 12px", fontSize: 12,
                  color: NT.text, fontWeight: 700 }}>#{job.id}</div>
                <div style={{ flex: 1, padding: "10px 12px" }}>
                  <span style={{ fontSize: 9, padding: "2px 6px",
                    background: job.role === "provider" ? `${NT.cyan}14` : `${NT.green}14`,
                    color: job.role === "provider" ? NT.cyan : NT.green,
                    border: `1px solid ${job.role === "provider" ? NT.cyan : NT.green}44`,
                    letterSpacing: "0.1em" }}>
                    {job.role.toUpperCase()}
                  </span>
                </div>
                <div style={{ flex: 1, padding: "10px 12px" }}>
                  <StatusPill status={job.status} />
                </div>
                <div style={{ flex: 1, padding: "10px 12px",
                  color: NT.textMuted, fontSize: 11 }}>#{job.block}</div>
                <div style={{ flex: 2, padding: "10px 12px",
                  color: NT.textMuted, fontSize: 10,
                  fontFamily: "'Space Mono', monospace" }}>{job.tx}</div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <a href={`https://testnet.arcscan.app/token/${CONTRACTS.IDENTITY_REGISTRY}/instance/${id}`}
          target="_blank" rel="noreferrer" style={{
            padding: "8px 16px", background: "transparent",
            border: `1px solid ${NT.border}`, color: NT.textMuted,
            fontFamily: "'Space Mono', monospace", fontSize: 10,
            letterSpacing: "0.14em", textDecoration: "none",
          }}>
          VIEW ON EXPLORER ↗
        </a>
      </div>
    </PageShell>
  )
}
