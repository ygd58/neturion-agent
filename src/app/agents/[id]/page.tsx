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
  const [activeTab, setActiveTab] = useState("overview")

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

        const latest = await (client as any).getBlockNumber()
        const fromBlock = latest > 9000n ? latest - 9000n : 0n
        const paddedOwner = (owner as string).toLowerCase().replace("0x", "0x000000000000000000000000")

        const [asProvider, asClient, completedLogs] = await Promise.all([
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_CREATED_TOPIC, null, null, paddedOwner], fromBlock, toBlock: latest }),
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_CREATED_TOPIC, null, paddedOwner], fromBlock, toBlock: latest }),
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_COMPLETED_TOPIC], fromBlock, toBlock: latest }),
        ])

        const completedIds = new Set(completedLogs.map((l: any) => l.topics[1]))
        const allJobs = [
          ...asProvider.map((l: any) => ({ id: l.topics[1] ? BigInt(l.topics[1]).toString() : "?", role: "provider", status: completedIds.has(l.topics[1]) ? "COMPLETED" : "OPEN", block: l.blockNumber?.toString() ?? "?", tx: l.transactionHash?.slice(0, 14) + "..." ?? "" })),
          ...asClient.map((l: any) => ({ id: l.topics[1] ? BigInt(l.topics[1]).toString() : "?", role: "client", status: completedIds.has(l.topics[1]) ? "COMPLETED" : "OPEN", block: l.blockNumber?.toString() ?? "?", tx: l.transactionHash?.slice(0, 14) + "..." ?? "" })),
        ]
        setJobs(allJobs)
      } catch(e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [client, id])

  if (loading) return (
    <PageShell>
      <div style={{ padding: 60, textAlign: "center" }}>
        <div style={{ fontFamily: "'Orbitron', monospace", color: NT.green,
          fontSize: 12, letterSpacing: "0.2em", animation: "pulse-dot 1.5s infinite" }}>
          LOADING AGENT #{id}...
        </div>
      </div>
    </PageShell>
  )

  if (!agent) return (
    <PageShell>
      <div style={{ padding: 40, textAlign: "center", color: NT.danger, fontSize: 11 }}>AGENT NOT FOUND</div>
    </PageShell>
  )

  const rc = ROLES[agent.meta.role as keyof typeof ROLES] ?? { color: NT.cyan, glyph: "●", short: "UNKN" }
  const hasRep = agent.repCount > 0
  const avg = hasRep ? agent.repScore / agent.repCount : 0
  const completedJobs = jobs.filter(j => j.status === "COMPLETED")
  const successRate = jobs.length > 0 ? ((completedJobs.length / jobs.length) * 100).toFixed(0) : "N/A"

  const tabs = ["overview", "jobs", "reputation"]

  return (
    <PageShell>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <Link href="/agents" style={{ color: NT.textMuted, fontSize: 10,
          letterSpacing: "0.14em", textDecoration: "none" }}>← AGENTS</Link>
        <div style={{ fontSize: 10, letterSpacing: "0.32em", color: NT.green, marginTop: 8 }}>
          ▸ ./registry / #{id}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
          <span style={{ fontSize: 28, color: rc.color }}>{rc.glyph}</span>
          <div>
            <h1 style={{ margin: 0, fontFamily: "'Orbitron', monospace",
              fontSize: 22, fontWeight: 800, color: NT.text, letterSpacing: "0.06em" }}>
              {agent.meta.name ?? "UNKNOWN"}
            </h1>
            <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
              <RoleChip role={agent.meta.role ?? "unknown"} />
              <span style={{ fontSize: 10, color: NT.textMuted, letterSpacing: "0.1em",
                fontFamily: "'Space Mono', monospace" }}>
                #{agent.id.toString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "REP SCORE", value: hasRep ? avg.toFixed(1) : "—", color: avg >= 80 ? NT.green : NT.amber },
          { label: "JOBS", value: jobs.length.toString(), color: NT.cyan },
          { label: "SUCCESS", value: successRate === "N/A" ? "—" : successRate + "%", color: NT.green },
        ].map(s => (
          <div key={s.label} style={{ padding: "12px 14px", border: `1px solid ${NT.border}`,
            background: NT.surface }}>
            <div style={{ fontSize: 9, letterSpacing: "0.18em", color: NT.textMuted, marginBottom: 6 }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 20,
              fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", marginBottom: 14, borderBottom: `1px solid ${NT.border}` }}>
        {tabs.map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)} style={{
            padding: "10px 16px", cursor: "pointer", background: "transparent",
            border: "none", borderBottom: activeTab === tab ? `2px solid ${NT.green}` : "2px solid transparent",
            color: activeTab === tab ? NT.green : NT.textMuted,
            fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          <Panel title="Identity" accent={NT.green}>
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                ["Agent ID", "#" + agent.id.toString()],
                ["Name", agent.meta.name ?? "—"],
                ["Role", agent.meta.role ?? "—"],
                ["Version", agent.meta.version ?? "—"],
                ["Network", agent.meta.network ?? "Arc Testnet"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between",
                  gap: 8, borderBottom: `1px solid ${NT.border}`, paddingBottom: 8 }}>
                  <span style={{ fontSize: 10, color: NT.textMuted, flexShrink: 0 }}>{k}</span>
                  <span style={{ fontSize: 11, color: NT.text,
                    fontFamily: "'Space Mono', monospace", textAlign: "right",
                    wordBreak: "break-all" }}>{v}</span>
                </div>
              ))}
              <div>
                <div style={{ fontSize: 10, color: NT.textMuted, marginBottom: 8 }}>OWNER</div>
                <div style={{ fontSize: 10, color: NT.textDim,
                  fontFamily: "'Space Mono', monospace", wordBreak: "break-all" }}>
                  {agent.owner}
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Capabilities" accent={NT.cyan}>
            <div style={{ padding: 16 }}>
              {(agent.meta.capabilities ?? []).length === 0 ? (
                <div style={{ color: NT.textMuted, fontSize: 11 }}>No capabilities listed</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {(agent.meta.capabilities ?? []).map((cap: string) => (
                    <span key={cap} style={{ padding: "6px 10px",
                      background: `${NT.cyan}0a`, color: NT.cyan,
                      border: `1px solid ${NT.cyan}33`, fontSize: 11,
                      letterSpacing: "0.08em", fontWeight: 700 }}>{cap}</span>
                  ))}
                </div>
              )}

              {agent.meta.endpoint && (
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: `1px solid ${NT.border}` }}>
                  <div style={{ fontSize: 10, color: NT.textMuted, marginBottom: 6 }}>ENDPOINT</div>
                  <div style={{ fontSize: 10, color: NT.textDim,
                    fontFamily: "'Space Mono', monospace", wordBreak: "break-all" }}>
                    {agent.meta.endpoint}
                  </div>
                </div>
              )}
            </div>
          </Panel>
        </div>
      )}

      {activeTab === "jobs" && (
        <Panel title={`Job History · ${jobs.length} total`} accent={NT.cyan}>
          {jobs.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: NT.textMuted, fontSize: 11 }}>
              NO JOBS IN LAST 9000 BLOCKS
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", background: NT.surface2,
                borderBottom: `1px solid ${NT.border}` }}>
                {["JOB ID", "ROLE", "STATUS", "BLOCK", "TX"].map(h => (
                  <div key={h} style={{ flex: 1, padding: "8px 12px",
                    fontSize: 9, letterSpacing: "0.18em", color: NT.textMuted, fontWeight: 700 }}>{h}</div>
                ))}
              </div>
              {jobs.map((job, i) => (
                <Link key={i} href={`/jobs/${job.id}`} style={{
                  display: "flex", borderBottom: `1px solid ${NT.border}`,
                  background: i % 2 ? "rgba(255,255,255,0.01)" : "transparent",
                  textDecoration: "none",
                }}>
                  <div style={{ flex: 1, padding: "10px 12px", fontSize: 12,
                    color: NT.text, fontWeight: 700 }}>#{job.id}</div>
                  <div style={{ flex: 1, padding: "10px 12px" }}>
                    <span style={{ fontSize: 9, padding: "2px 6px",
                      background: job.role === "provider" ? `${NT.cyan}14` : `${NT.green}14`,
                      color: job.role === "provider" ? NT.cyan : NT.green,
                      border: `1px solid ${job.role === "provider" ? NT.cyan : NT.green}44` }}>
                      {job.role.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ flex: 1, padding: "10px 12px" }}>
                    <StatusPill status={job.status} />
                  </div>
                  <div style={{ flex: 1, padding: "10px 12px",
                    color: NT.textMuted, fontSize: 11 }}>#{job.block}</div>
                  <div style={{ flex: 1, padding: "10px 12px",
                    color: NT.textMuted, fontSize: 10,
                    fontFamily: "'Space Mono', monospace" }}>{job.tx}</div>
                </Link>
              ))}
            </div>
          )}
        </Panel>
      )}

      {activeTab === "reputation" && (
        <Panel title="ERC-8004 Reputation" accent={NT.amber}>
          <div style={{ padding: 24 }}>
            {hasRep ? (
              <div>
                <div style={{ textAlign: "center", padding: "20px 0 30px" }}>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 72,
                    fontWeight: 900, color: avg >= 80 ? NT.green : NT.amber,
                    textShadow: `0 0 30px ${avg >= 80 ? NT.green : NT.amber}44`,
                    lineHeight: 1 }}>
                    {avg.toFixed(1)}
                  </div>
                  <div style={{ color: NT.textMuted, fontSize: 10,
                    letterSpacing: "0.2em", marginTop: 8 }}>AVERAGE REPUTATION SCORE</div>
                </div>

                {/* Score bar */}
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: "flex", justifyContent: "space-between",
                    fontSize: 9, color: NT.textMuted, letterSpacing: "0.14em", marginBottom: 6 }}>
                    <span>0</span><span>50</span><span>100</span>
                  </div>
                  <div style={{ height: 8, background: NT.surface2,
                    border: `1px solid ${NT.border}`, position: "relative" }}>
                    <div style={{ height: "100%",
                      width: avg + "%",
                      background: avg >= 80 ? NT.green : NT.amber,
                      boxShadow: `0 0 10px ${avg >= 80 ? NT.green : NT.amber}66`,
                      transition: "width 0.5s ease" }} />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {[
                    ["Total Score", "+" + agent.repScore],
                    ["Review Count", agent.repCount + "x"],
                    ["Avg Score", avg.toFixed(2) + " / 100"],
                    ["Rating", avg >= 90 ? "EXCELLENT" : avg >= 70 ? "GOOD" : "NEEDS WORK"],
                  ].map(([k, v]) => (
                    <div key={k} style={{ padding: "12px 14px",
                      background: NT.surface2, border: `1px solid ${NT.border}` }}>
                      <div style={{ fontSize: 9, letterSpacing: "0.14em",
                        color: NT.textMuted, marginBottom: 6 }}>{k}</div>
                      <div style={{ fontSize: 14, fontFamily: "'Orbitron', monospace",
                        fontWeight: 700, color: NT.text }}>{v}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 16, padding: "12px 14px",
                  background: `${NT.amber}08`, border: `1px solid ${NT.amber}33`,
                  fontSize: 10, color: NT.textDim, letterSpacing: "0.08em", lineHeight: 1.6 }}>
                  ERC-8004 §4.2 — Agent owners cannot give reputation to their own agents.
                  Scores are issued by independent evaluators after job completion.
                </div>
              </div>
            ) : (
              <div style={{ padding: "40px 20px", textAlign: "center" }}>
                <div style={{ color: NT.textMuted, fontSize: 12,
                  letterSpacing: "0.14em", marginBottom: 12 }}>NO REPUTATION YET</div>
                <div style={{ color: NT.textMuted, fontSize: 11, lineHeight: 1.7 }}>
                  Complete jobs as a provider to earn reputation scores from evaluators.
                  Reputation is recorded onchain via the ERC-8004 ReputationRegistry.
                </div>
              </div>
            )}
          </div>
        </Panel>
      )}

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
        <Link href={`/create?provider=${agent.owner}`} style={{
          padding: "8px 16px", background: `${NT.green}14`,
          border: `1px solid ${NT.green}66`, color: NT.green,
          fontFamily: "'Space Mono', monospace", fontSize: 10,
          letterSpacing: "0.14em", textDecoration: "none",
        }}>
          CREATE JOB WITH AGENT ▸
        </Link>
      </div>
    </PageShell>
  )
}
