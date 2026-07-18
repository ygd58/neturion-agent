"use client"
import { usePublicClient, useAccount, useWriteContract } from "wagmi"
import { useEffect, useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import PageShell from "@/components/PageShell"
import { Panel, StatusPill } from "@/components/atoms"
import { NETURION_JOB_BOARD, JOB_BOARD_ABI } from "@/lib/jobboard"
import { NT } from "@/lib/tokens"
import Link from "next/link"

const STATUS = ["Open", "Assigned", "Completed", "Cancelled"]
const STATUS_COLORS: Record<string, string> = {
  Open: "var(--cyan)", Assigned: "var(--amber)",
  Completed: "var(--green)", Cancelled: "var(--danger)"
}

export default function JobBoardPage() {
  const { address, isConnected } = useAccount()
  const client = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [stats, setStats] = useState({ totalJobs: 0, totalAgents: 0 })
  const [jobs, setJobs] = useState<any[]>([])
  const [myAgent, setMyAgent] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("jobs")

  // Post job form
  const [form, setForm] = useState({ provider: "", description: "", budget: "1" })
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState("")

  // Register agent form
  const [agentForm, setAgentForm] = useState({ agentId: "", name: "", role: "worker" })
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    if (!client) return
    async function load() {
      try {
        const [totalJobs, totalAgents] = await (client as any).readContract({
          address: NETURION_JOB_BOARD, abi: JOB_BOARD_ABI, functionName: "getStats",
        }) as [bigint, bigint]
        setStats({ totalJobs: Number(totalJobs), totalAgents: Number(totalAgents) })

        // Load recent jobs
        const count = Number(totalJobs)
        const loaded = []
        for (let i = Math.max(1, count - 9); i <= count; i++) {
          try {
            const job = await (client as any).readContract({
              address: NETURION_JOB_BOARD, abi: JOB_BOARD_ABI,
              functionName: "getJob", args: [BigInt(i)],
            }) as any
            loaded.push({ ...job, id: i })
          } catch {}
        }
        setJobs(loaded.reverse())

        // Load my agent
        if (address) {
          try {
            const agent = await (client as any).readContract({
              address: NETURION_JOB_BOARD, abi: JOB_BOARD_ABI,
              functionName: "getAgent", args: [address],
            }) as any
            if (agent.registered) setMyAgent(agent)
          } catch {}
        }
      } catch(e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [client, address])

  async function handlePostJob(e: React.FormEvent) {
    e.preventDefault()
    if (!address) return
    setPosting(true)
    try {
      const hash = await (writeContractAsync as any)({
        address: NETURION_JOB_BOARD, abi: JOB_BOARD_ABI,
        functionName: "postJob",
        args: [form.provider || "0x0000000000000000000000000000000000000000", form.description, BigInt(form.budget)],
      })
      setPosted(hash)
      setForm({ provider: "", description: "", budget: "1" })
    } catch(e: any) {
      console.error(e)
    }
    setPosting(false)
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setRegistering(true)
    try {
      await (writeContractAsync as any)({
        address: NETURION_JOB_BOARD, abi: JOB_BOARD_ABI,
        functionName: "registerAgent",
        args: [BigInt(agentForm.agentId || "0"), agentForm.name, agentForm.role],
      })
      setAgentForm({ agentId: "", name: "", role: "worker" })
    } catch(e: any) { console.error(e) }
    setRegistering(false)
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--surface2)",
    border: "1px solid var(--border-hi)", color: "var(--text)",
    fontFamily: "'Space Mono', monospace", fontSize: 12,
    padding: "10px 12px", outline: "none",
  }

  return (
    <PageShell>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--green)" }}>
          ▸ ./jobboard / neturion
        </div>
        <h1 style={{ margin: "6px 0 4px", fontFamily: "'Orbitron', monospace",
          fontSize: 24, fontWeight: 800, color: "var(--text)", textTransform: "uppercase" }}>
          Neturion <span style={{ color: "var(--green)" }}>Job Board</span>
        </h1>
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'Space Mono', monospace" }}>
          {NETURION_JOB_BOARD}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div style={{ padding: "12px 16px", border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>TOTAL JOBS</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 700, color: "var(--green)" }}>
            {loading ? "..." : stats.totalJobs}
          </div>
        </div>
        <div style={{ padding: "12px 16px", border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>REGISTERED AGENTS</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 700, color: "var(--cyan)" }}>
            {loading ? "..." : stats.totalAgents}
          </div>
        </div>
      </div>

      {/* My Agent */}
      {myAgent && (
        <div style={{ padding: "12px 16px", marginBottom: 16,
          border: "1px solid var(--green)", background: "rgba(0,255,136,0.04)" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--green)", marginBottom: 6 }}>MY AGENT PROFILE</div>
          <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
            <div>
              <span style={{ fontFamily: "'Orbitron', monospace", fontWeight: 700, color: "var(--text)" }}>
                {myAgent.name}
              </span>
              <span style={{ fontSize: 9, marginLeft: 8, color: "var(--text-muted)" }}>{myAgent.role}</span>
            </div>
            <div style={{ display: "flex", gap: 16, fontSize: 11 }}>
              <span style={{ color: "var(--text-muted)" }}>Jobs: <span style={{ color: "var(--text)" }}>{myAgent.jobsCompleted.toString()}</span></span>
              <span style={{ color: "var(--text-muted)" }}>Earned: <span style={{ color: "var(--green)" }}>{myAgent.totalEarned.toString()} USDC</span></span>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {["jobs", "post job", "register agent"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 16px", cursor: "pointer", background: "transparent",
            border: "none", borderBottom: tab === t ? "2px solid var(--green)" : "2px solid transparent",
            color: tab === t ? "var(--green)" : "var(--text-muted)",
            fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
          }}>{t}</button>
        ))}
      </div>

      {/* Jobs list */}
      {tab === "jobs" && (
        <Panel accent="var(--cyan)">
          {loading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} style={{ height: 56, borderBottom: "1px solid var(--border)" }} />
            ))
          ) : jobs.length === 0 ? (
            <div style={{ padding: 30, textAlign: "center", color: "var(--text-muted)", fontSize: 11 }}>
              No jobs posted yet. Be the first!
            </div>
          ) : jobs.map((job, i) => {
            const statusLabel = STATUS[job.status] ?? "Unknown"
            const statusColor = STATUS_COLORS[statusLabel] ?? "var(--text-muted)"
            return (
              <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid var(--border)",
                position: "relative" }}>
                <span style={{ position: "absolute", left: 0, top: 8, bottom: 8,
                  width: 2, background: statusColor }} />
                <div style={{ display: "flex", justifyContent: "space-between",
                  alignItems: "flex-start", gap: 8, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 13 }}>
                        #{job.id}
                      </span>
                      <span style={{ fontSize: 9, padding: "1px 6px",
                        background: statusColor + "14", color: statusColor,
                        border: "1px solid " + statusColor + "44", letterSpacing: "0.1em" }}>
                        {statusLabel.toUpperCase()}
                      </span>
                    </div>
                    <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0, lineHeight: 1.5 }}>
                      {job.description?.slice(0, 80)}{job.description?.length > 80 ? "..." : ""}
                    </p>
                    <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4,
                      fontFamily: "'Space Mono', monospace" }}>
                      Client: {job.client?.slice(0,10)}...
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 16,
                      fontWeight: 700, color: "var(--green)" }}>
                      {job.budget?.toString()} USDC
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </Panel>
      )}

      {/* Post Job */}
      {tab === "post job" && (
        !isConnected ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>Connect wallet to post jobs</p>
            <ConnectButton />
          </div>
        ) : (
          <Panel title="Post a Job" accent="var(--green)">
            <form onSubmit={handlePostJob}>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ PROVIDER ADDRESS (optional)</div>
                  <input type="text" placeholder="0x... (leave empty for open bid)"
                    value={form.provider} onChange={e => setForm(f => ({...f, provider: e.target.value}))}
                    style={inputStyle} />
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ DESCRIPTION</div>
                  <textarea placeholder="Describe the task..." required
                    value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                    style={{ ...inputStyle, height: 80, resize: "none" }} />
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ BUDGET (USDC)</div>
                  <input type="number" min="1" required
                    value={form.budget} onChange={e => setForm(f => ({...f, budget: e.target.value}))}
                    style={inputStyle} />
                </div>
                {posted && (
                  <div style={{ padding: "10px 12px", background: "rgba(0,255,136,0.06)",
                    border: "1px solid var(--green)", color: "var(--green)", fontSize: 10 }}>
                    ✓ Job posted! TX: {posted.slice(0,20)}...
                  </div>
                )}
                <button type="submit" disabled={posting} style={{
                  padding: 12, background: "var(--green-dim)", border: "1px solid var(--green)",
                  color: "var(--green)", fontFamily: "'Space Mono', monospace",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", cursor: "pointer",
                }}>
                  {posting ? "POSTING..." : "▸ POST JOB ONCHAIN"}
                </button>
              </div>
            </form>
          </Panel>
        )
      )}

      {/* Register Agent */}
      {tab === "register agent" && (
        !isConnected ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>Connect wallet to register</p>
            <ConnectButton />
          </div>
        ) : (
          <Panel title="Register Agent Profile" accent="var(--cyan)">
            <form onSubmit={handleRegister}>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ ERC-8004 AGENT ID (optional)</div>
                  <input type="number" placeholder="Your ERC-8004 agent ID"
                    value={agentForm.agentId} onChange={e => setAgentForm(f => ({...f, agentId: e.target.value}))}
                    style={inputStyle} />
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ AGENT NAME</div>
                  <input type="text" placeholder="AGENT-NAME" required
                    value={agentForm.name} onChange={e => setAgentForm(f => ({...f, name: e.target.value.toUpperCase()}))}
                    style={inputStyle} />
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ ROLE</div>
                  <div style={{ display: "flex", gap: 8 }}>
                    {["worker", "orchestrator", "evaluator"].map(r => (
                      <button key={r} type="button" onClick={() => setAgentForm(f => ({...f, role: r}))} style={{
                        flex: 1, padding: "10px 8px", cursor: "pointer",
                        background: agentForm.role === r ? "rgba(0,255,136,0.1)" : "var(--surface2)",
                        border: "1px solid " + (agentForm.role === r ? "var(--green)" : "var(--border)"),
                        color: agentForm.role === r ? "var(--green)" : "var(--text-muted)",
                        fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={registering} style={{
                  padding: 12, background: "rgba(0,212,255,0.1)", border: "1px solid var(--cyan)",
                  color: "var(--cyan)", fontFamily: "'Space Mono', monospace",
                  fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", cursor: "pointer",
                }}>
                  {registering ? "REGISTERING..." : "▸ REGISTER AGENT"}
                </button>
              </div>
            </form>
          </Panel>
        )
      )}
    </PageShell>
  )
}
