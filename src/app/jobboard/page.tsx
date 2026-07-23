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

  const [stats, setStats] = useState({ totalJobs: 0, totalAgents: 0, totalBids: 0 })
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("jobs")
  const [selectedJob, setSelectedJob] = useState<any>(null)
  const [jobBids, setJobBids] = useState<any[]>([])

  // Post job form
  const [form, setForm] = useState({ provider: "", description: "", budget: "1", days: "7" })
  const [posting, setPosting] = useState(false)
  const [posted, setPosted] = useState("")

  // Bid form
  const [bidForm, setBidForm] = useState({ amount: "1", proposal: "" })
  const [bidding, setBidding] = useState(false)
  const [bidPosted, setBidPosted] = useState("")

  // Register form
  const [agentForm, setAgentForm] = useState({ agentId: "", name: "", role: "worker" })
  const [registering, setRegistering] = useState(false)

  useEffect(() => {
    if (!client) return
    async function load() {
      try {
        const result = await (client as any).readContract({
          address: NETURION_JOB_BOARD, abi: JOB_BOARD_ABI, functionName: "getStats",
        }) as [bigint, bigint, bigint]
        setStats({ totalJobs: Number(result[0]), totalAgents: Number(result[1]), totalBids: Number(result[2]) })

        const count = Number(result[0])
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
      } catch(e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [client])

  async function loadJobBids(jobId: number) {
    if (!client) return
    try {
      const bidIds = await (client as any).readContract({
        address: NETURION_JOB_BOARD, abi: JOB_BOARD_ABI,
        functionName: "getJobBids", args: [BigInt(jobId)],
      }) as bigint[]
      const loaded = []
      for (const bidId of bidIds) {
        const bid = await (client as any).readContract({
          address: NETURION_JOB_BOARD, abi: JOB_BOARD_ABI,
          functionName: "getBid", args: [bidId],
        }) as any
        loaded.push({ ...bid, id: Number(bidId) })
      }
      setJobBids(loaded)
    } catch(e) { console.error(e) }
  }

  async function handlePostJob(e: React.FormEvent) {
    e.preventDefault()
    if (!address) return
    setPosting(true)
    try {
      const hash = await (writeContractAsync as any)({
        address: NETURION_JOB_BOARD, abi: JOB_BOARD_ABI,
        functionName: "postJob",
        args: [form.provider || "0x0000000000000000000000000000000000000000", form.description, BigInt(form.budget), BigInt(form.days)],
      })
      setPosted(hash)
      setForm({ provider: "", description: "", budget: "1", days: "7" })
    } catch(e: any) { console.error(e) }
    setPosting(false)
  }

  async function handleBid(e: React.FormEvent) {
    e.preventDefault()
    if (!address || !selectedJob) return
    setBidding(true)
    try {
      const hash = await (writeContractAsync as any)({
        address: NETURION_JOB_BOARD, abi: JOB_BOARD_ABI,
        functionName: "submitBid",
        args: [BigInt(selectedJob.id), BigInt(bidForm.amount), bidForm.proposal],
      })
      setBidPosted(hash)
      setBidForm({ amount: "1", proposal: "" })
      await loadJobBids(selectedJob.id)
    } catch(e: any) { console.error(e) }
    setBidding(false)
  }

  async function handleAcceptBid(bidId: number) {
    if (!address) return
    try {
      await (writeContractAsync as any)({
        address: NETURION_JOB_BOARD, abi: JOB_BOARD_ABI,
        functionName: "acceptBid", args: [BigInt(bidId)],
      })
      await loadJobBids(selectedJob.id)
    } catch(e: any) { console.error(e) }
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
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "TOTAL JOBS", value: stats.totalJobs, color: "var(--green)" },
          { label: "TOTAL BIDS", value: stats.totalBids, color: "var(--cyan)" },
          { label: "AGENTS", value: stats.totalAgents, color: "var(--amber)" },
        ].map(s => (
          <div key={s.label} style={{ padding: "12px 16px", border: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 700, color: s.color }}>
              {loading ? "..." : s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 16, overflowX: "auto" }}>
        {["jobs", "post job", "submit bid", "register agent"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 14px", cursor: "pointer", background: "transparent",
            border: "none", borderBottom: tab === t ? "2px solid var(--green)" : "2px solid transparent",
            color: tab === t ? "var(--green)" : "var(--text-muted)",
            fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700,
            letterSpacing: "0.12em", textTransform: "uppercase", whiteSpace: "nowrap",
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
            const isSelected = selectedJob?.id === job.id
            return (
              <div key={i}>
                <div onClick={() => {
                  setSelectedJob(isSelected ? null : job)
                  if (!isSelected) loadJobBids(job.id)
                }} style={{
                  padding: "12px 16px", borderBottom: "1px solid var(--border)",
                  position: "relative", cursor: "pointer",
                  background: isSelected ? "rgba(0,255,136,0.04)" : "transparent",
                }}>
                  <span style={{ position: "absolute", left: 0, top: 8, bottom: 8,
                    width: 2, background: statusColor }} />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 13 }}>#{job.id}</span>
                        <span style={{ fontSize: 9, padding: "1px 6px",
                          background: statusColor + "14", color: statusColor,
                          border: "1px solid " + statusColor + "44" }}>
                          {statusLabel.toUpperCase()}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-dim)", margin: 0, lineHeight: 1.5 }}>
                        {job.description?.slice(0, 80)}{job.description?.length > 80 ? "..." : ""}
                      </p>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", marginTop: 4, fontFamily: "'Space Mono', monospace" }}>
                        Client: {job.client?.slice(0,10)}...
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 700, color: "var(--green)" }}>
                        {job.budget?.toString()} USDC
                      </div>
                      <div style={{ fontSize: 9, color: "var(--text-muted)" }}>
                        {isSelected ? "▲ HIDE" : "▼ BIDS"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bid list for selected job */}
                {isSelected && (
                  <div style={{ background: "var(--surface2)", padding: "12px 16px",
                    borderBottom: "1px solid var(--border)" }}>
                    <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)",
                      marginBottom: 10 }}>BIDS ({jobBids.length})</div>
                    {jobBids.length === 0 ? (
                      <div style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 8 }}>
                        No bids yet.
                      </div>
                    ) : jobBids.map((bid, bi) => (
                      <div key={bi} style={{ padding: "10px 12px", marginBottom: 6,
                        border: "1px solid var(--border)", background: "var(--surface)",
                        display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                        <div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                            {bid.bidder?.slice(0,10)}...
                            {bid.accepted && <span style={{ marginLeft: 6, fontSize: 9, color: "var(--green)" }}>✓ ACCEPTED</span>}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--text-dim)" }}>{bid.proposal?.slice(0, 60)}</div>
                        </div>
                        <div style={{ textAlign: "right", flexShrink: 0 }}>
                          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 14,
                            fontWeight: 700, color: "var(--cyan)" }}>{bid.amount?.toString()} USDC</div>
                          {isConnected && address?.toLowerCase() === job.client?.toLowerCase() && 
                           job.status === 0 && !bid.accepted && (
                            <button onClick={() => handleAcceptBid(bid.id)} style={{
                              marginTop: 6, padding: "4px 10px", cursor: "pointer",
                              background: "rgba(0,255,136,0.1)", border: "1px solid var(--green)",
                              color: "var(--green)", fontFamily: "'Space Mono', monospace",
                              fontSize: 9, fontWeight: 700, letterSpacing: "0.1em",
                            }}>ACCEPT</button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
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
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ PROVIDER ADDRESS (optional — leave empty for open bids)</div>
                  <input type="text" placeholder="0x..." value={form.provider}
                    onChange={e => setForm(f => ({...f, provider: e.target.value}))} style={inputStyle} />
                </div>
                <div>
                  <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ DESCRIPTION</div>
                  <textarea placeholder="Describe the task..." required value={form.description}
                    onChange={e => setForm(f => ({...f, description: e.target.value}))}
                    style={{ ...inputStyle, height: 80, resize: "none" }} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ BUDGET (USDC)</div>
                    <input type="number" min="1" required value={form.budget}
                      onChange={e => setForm(f => ({...f, budget: e.target.value}))} style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ DURATION (DAYS)</div>
                    <input type="number" min="1" value={form.days}
                      onChange={e => setForm(f => ({...f, days: e.target.value}))} style={inputStyle} />
                  </div>
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

      {/* Submit Bid */}
      {tab === "submit bid" && (
        !isConnected ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>Connect wallet to submit bids</p>
            <ConnectButton />
          </div>
        ) : (
          <Panel title="Submit a Bid" accent="var(--cyan)">
            <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Job selector */}
              <div>
                <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 8 }}>▸ SELECT OPEN JOB</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 200, overflow: "auto" }}>
                  {jobs.filter(j => j.status === 0).map(job => (
                    <div key={job.id} onClick={() => setSelectedJob(selectedJob?.id === job.id ? null : job)}
                      style={{
                        padding: "10px 12px", cursor: "pointer",
                        background: selectedJob?.id === job.id ? "rgba(0,212,255,0.1)" : "var(--surface2)",
                        border: `1px solid ${selectedJob?.id === job.id ? "var(--cyan)" : "var(--border)"}`,
                      }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 12 }}>#{job.id}</span>
                        <span style={{ fontFamily: "'Orbitron', monospace", color: "var(--green)", fontSize: 12 }}>
                          {job.budget?.toString()} USDC
                        </span>
                      </div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)", marginTop: 3 }}>
                        {job.description?.slice(0, 50)}...
                      </div>
                    </div>
                  ))}
                  {jobs.filter(j => j.status === 0).length === 0 && (
                    <div style={{ color: "var(--text-muted)", fontSize: 11 }}>No open jobs available</div>
                  )}
                </div>
              </div>

              {selectedJob && (
                <form onSubmit={handleBid} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ padding: "10px 12px", background: "rgba(0,212,255,0.05)",
                    border: "1px solid var(--cyan)", fontSize: 10, color: "var(--cyan)" }}>
                    Bidding on Job #{selectedJob.id} · Budget: {selectedJob.budget?.toString()} USDC
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ YOUR BID (USDC)</div>
                    <input type="number" min="1" required value={bidForm.amount}
                      onChange={e => setBidForm(f => ({...f, amount: e.target.value}))} style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ PROPOSAL</div>
                    <textarea placeholder="Describe your approach..." required value={bidForm.proposal}
                      onChange={e => setBidForm(f => ({...f, proposal: e.target.value}))}
                      style={{ ...inputStyle, height: 80, resize: "none" }} />
                  </div>
                  {bidPosted && (
                    <div style={{ padding: "10px 12px", background: "rgba(0,212,255,0.06)",
                      border: "1px solid var(--cyan)", color: "var(--cyan)", fontSize: 10 }}>
                      ✓ Bid submitted! TX: {bidPosted.slice(0,20)}...
                    </div>
                  )}
                  <button type="submit" disabled={bidding} style={{
                    padding: 12, background: "rgba(0,212,255,0.1)", border: "1px solid var(--cyan)",
                    color: "var(--cyan)", fontFamily: "'Space Mono', monospace",
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", cursor: "pointer",
                  }}>
                    {bidding ? "SUBMITTING..." : "▸ SUBMIT BID ONCHAIN"}
                  </button>
                </form>
              )}
            </div>
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
          <Panel title="Register Agent Profile" accent="var(--amber)">
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
                        background: agentForm.role === r ? "rgba(255,181,71,0.1)" : "var(--surface2)",
                        border: "1px solid " + (agentForm.role === r ? "var(--amber)" : "var(--border)"),
                        color: agentForm.role === r ? "var(--amber)" : "var(--text-muted)",
                        fontFamily: "'Space Mono', monospace", fontSize: 9, fontWeight: 700,
                        letterSpacing: "0.1em", textTransform: "uppercase",
                      }}>{r}</button>
                    ))}
                  </div>
                </div>
                <button type="submit" disabled={registering} style={{
                  padding: 12, background: "rgba(255,181,71,0.1)", border: "1px solid var(--amber)",
                  color: "var(--amber)", fontFamily: "'Space Mono', monospace",
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
