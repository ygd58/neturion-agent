"use client"
import { usePublicClient, useAccount, useWriteContract } from "wagmi"
import { useEffect, useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import PageShell from "@/components/PageShell"
import { Panel } from "@/components/atoms"
import { NETURION_ESCROW, ESCROW_ABI, ESCROW_STATUS, ESCROW_STATUS_COLORS } from "@/lib/escrow"
import { CONTRACTS, USDC_ABI } from "@/lib/arc"
import { NT } from "@/lib/tokens"
import { keccak256, toHex } from "viem"

const USDC_DECIMALS = 6n

function parseUSDC(amount: string): bigint {
  const [whole, frac = ""] = amount.split(".")
  return BigInt(whole) * 10n ** USDC_DECIMALS + BigInt(frac.slice(0, 6).padEnd(6, "0"))
}

function formatUSDC(amount: bigint): string {
  const whole = amount / 10n ** USDC_DECIMALS
  const frac = (amount % 10n ** USDC_DECIMALS).toString().padStart(6, "0").slice(0, 2)
  return whole + "." + frac
}

export default function EscrowPage() {
  const { address, isConnected } = useAccount()
  const client = usePublicClient()
  const { writeContractAsync } = useWriteContract()

  const [stats, setStats] = useState({ jobCount: 0, escrowBalance: "0" })
  const [myJobs, setMyJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState("my-jobs")

  const [form, setForm] = useState({ provider: "", evaluator: "", description: "", amount: "1.0", days: "7" })
  const [step, setStep] = useState<"idle"|"approving"|"creating"|"done"|"error">("idle")
  const [txHash, setTxHash] = useState("")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!client) return
    async function load() {
      try {
        const [jobCount, escrowBalance] = await Promise.all([
          (client as any).readContract({ address: NETURION_ESCROW, abi: ESCROW_ABI, functionName: "jobCount" }) as Promise<bigint>,
          (client as any).readContract({ address: NETURION_ESCROW, abi: ESCROW_ABI, functionName: "getEscrowBalance" }) as Promise<bigint>,
        ])
        setStats({ jobCount: Number(jobCount), escrowBalance: formatUSDC(escrowBalance) })

        if (address) {
          const [clientJobIds, providerJobIds] = await Promise.all([
            (client as any).readContract({ address: NETURION_ESCROW, abi: ESCROW_ABI, functionName: "getClientJobs", args: [address] }) as Promise<bigint[]>,
            (client as any).readContract({ address: NETURION_ESCROW, abi: ESCROW_ABI, functionName: "getProviderJobs", args: [address] }) as Promise<bigint[]>,
          ])
          const allIds = [...new Set([...clientJobIds, ...providerJobIds])]
          const jobs = []
          for (const id of allIds.slice(-10)) {
            const job = await (client as any).readContract({ address: NETURION_ESCROW, abi: ESCROW_ABI, functionName: "getJob", args: [id] }) as any
            const isClient = job.client?.toLowerCase() === address.toLowerCase()
            jobs.push({ ...job, isClient })
          }
          setMyJobs(jobs.reverse())
        }
      } catch(e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [client, address])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!address || !client) return
    setStep("approving"); setError("")

    try {
      const amount = parseUSDC(form.amount)
      const fee = (amount * 25n) / 10000n
      const total = amount + fee

      const h1 = await (writeContractAsync as any)({
        address: CONTRACTS.USDC, abi: USDC_ABI,
        functionName: "approve", args: [NETURION_ESCROW, total],
      })

      setStep("creating")
      const h2 = await (writeContractAsync as any)({
        address: NETURION_ESCROW, abi: ESCROW_ABI,
        functionName: "createAndFund",
        args: [
          (form.provider || "0x0000000000000000000000000000000000000000") as `0x${string}`,
          (form.evaluator || address) as `0x${string}`,
          form.description,
          amount,
          BigInt(form.days),
        ],
      })
      setTxHash(h2)
      setStep("done")
      setForm({ provider: "", evaluator: "", description: "", amount: "1.0", days: "7" })
    } catch(e: any) {
      setError(e.shortMessage ?? e.message ?? "TX failed")
      setStep("error")
    }
  }

  async function handleApprove(jobId: bigint) {
    try {
      await (writeContractAsync as any)({
        address: NETURION_ESCROW, abi: ESCROW_ABI,
        functionName: "approveDelivery", args: [jobId],
      })
    } catch(e: any) { console.error(e) }
  }

  async function handleCancel(jobId: bigint) {
    try {
      await (writeContractAsync as any)({
        address: NETURION_ESCROW, abi: ESCROW_ABI,
        functionName: "cancelJob", args: [jobId],
      })
    } catch(e: any) { console.error(e) }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: "var(--surface2)",
    border: "1px solid var(--border-hi)", color: "var(--text)",
    fontFamily: "'Space Mono', monospace", fontSize: 12,
    padding: "10px 12px", outline: "none",
  }

  const STEPS = [
    { key: "approving", label: "APPROVE USDC", desc: "Allow escrow to spend your USDC" },
    { key: "creating", label: "CREATE & FUND", desc: "Lock USDC in escrow contract" },
    { key: "done", label: "FUNDED", desc: "Job created and USDC locked" },
  ]

  return (
    <PageShell>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--green)" }}>▸ ./escrow / neturion</div>
        <h1 style={{ margin: "6px 0 4px", fontFamily: "'Orbitron', monospace",
          fontSize: 24, fontWeight: 800, color: "var(--text)", textTransform: "uppercase" }}>
          USDC <span style={{ color: "var(--green)" }}>Escrow</span>
        </h1>
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'Space Mono', monospace" }}>
          {NETURION_ESCROW} · 0.25% platform fee
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
        <div style={{ padding: "12px 16px", border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>TOTAL JOBS</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 24, fontWeight: 700, color: "var(--green)" }}>
            {loading ? "..." : stats.jobCount}
          </div>
        </div>
        <div style={{ padding: "12px 16px", border: "1px solid var(--border)", background: "var(--surface)" }}>
          <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>ESCROW BALANCE</div>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 20, fontWeight: 700, color: "var(--cyan)" }}>
            {loading ? "..." : stats.escrowBalance} <span style={{ fontSize: 11 }}>USDC</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--border)", marginBottom: 16 }}>
        {["my-jobs", "create job"].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: "10px 16px", cursor: "pointer", background: "transparent",
            border: "none", borderBottom: tab === t ? "2px solid var(--green)" : "2px solid transparent",
            color: tab === t ? "var(--green)" : "var(--text-muted)",
            fontFamily: "'Space Mono', monospace", fontSize: 10, fontWeight: 700,
            letterSpacing: "0.14em", textTransform: "uppercase",
          }}>{t}</button>
        ))}
      </div>

      {/* My Jobs */}
      {tab === "my-jobs" && (
        !isConnected ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>Connect wallet to see your jobs</p>
            <ConnectButton />
          </div>
        ) : (
          <Panel accent="var(--green)">
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ height: 80, borderBottom: "1px solid var(--border)" }} />
              ))
            ) : myJobs.length === 0 ? (
              <div style={{ padding: 40, textAlign: "center" }}>
                <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>No escrow jobs yet</p>
                <button onClick={() => setTab("create job")} style={{
                  padding: "8px 16px", background: "var(--green-dim)", border: "1px solid var(--green)",
                  color: "var(--green)", fontFamily: "'Space Mono', monospace",
                  fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", cursor: "pointer",
                }}>▸ CREATE FIRST JOB</button>
              </div>
            ) : myJobs.map((job, i) => {
              const statusLabel = ESCROW_STATUS[job.status] ?? "Unknown"
              const statusColor = ESCROW_STATUS_COLORS[statusLabel] ?? "var(--text-muted)"
              const amount = formatUSDC(job.amount ?? 0n)
              return (
                <div key={i} style={{ padding: "14px 16px", borderBottom: "1px solid var(--border)", position: "relative" }}>
                  <span style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 2, background: statusColor }} />
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                        <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 13 }}>
                          #{job.id?.toString()}
                        </span>
                        <span style={{ fontSize: 9, padding: "2px 7px",
                          background: statusColor + "14", color: statusColor,
                          border: "1px solid " + statusColor + "44", letterSpacing: "0.1em" }}>
                          {statusLabel.toUpperCase()}
                        </span>
                        <span style={{ fontSize: 9, padding: "2px 7px",
                          background: job.isClient ? "var(--green-dim)" : "rgba(0,212,255,0.1)",
                          color: job.isClient ? "var(--green)" : "var(--cyan)",
                          border: "1px solid " + (job.isClient ? "var(--green)" : "var(--cyan)") + "44",
                          letterSpacing: "0.1em" }}>
                          {job.isClient ? "CLIENT" : "PROVIDER"}
                        </span>
                      </div>
                      <p style={{ fontSize: 11, color: "var(--text-dim)", margin: "0 0 6px", lineHeight: 1.5 }}>
                        {job.description?.slice(0, 80)}
                      </p>
                      <div style={{ fontSize: 9, color: "var(--text-muted)", fontFamily: "'Space Mono', monospace" }}>
                        {job.isClient ? "Provider: " + job.provider?.slice(0,12) + "..." : "Client: " + job.client?.slice(0,12) + "..."}
                      </div>
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18,
                        fontWeight: 700, color: "var(--green)", marginBottom: 8 }}>
                        {amount} USDC
                      </div>
                      <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                        {job.isClient && job.status === 2 && (
                          <button onClick={() => handleApprove(job.id)} style={{
                            padding: "5px 10px", background: "rgba(0,255,136,0.1)",
                            border: "1px solid var(--green)", color: "var(--green)",
                            fontFamily: "'Space Mono', monospace", fontSize: 9,
                            fontWeight: 700, cursor: "pointer", letterSpacing: "0.1em",
                          }}>✓ APPROVE</button>
                        )}
                        {job.isClient && (job.status === 1 || job.status === 0) && (
                          <button onClick={() => handleCancel(job.id)} style={{
                            padding: "5px 10px", background: "rgba(255,59,107,0.1)",
                            border: "1px solid var(--danger)", color: "var(--danger)",
                            fontFamily: "'Space Mono', monospace", fontSize: 9,
                            fontWeight: 700, cursor: "pointer", letterSpacing: "0.1em",
                          }}>✗ CANCEL</button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}
          </Panel>
        )
      )}

      {/* Create Job */}
      {tab === "create job" && (
        !isConnected ? (
          <div style={{ padding: 40, textAlign: "center" }}>
            <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 16 }}>Connect wallet to create escrow jobs</p>
            <ConnectButton />
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 360px", gap: 14 }}>
            <Panel title="Job Specification" accent="var(--green)">
              <form onSubmit={handleCreate}>
                <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ PROVIDER ADDRESS</div>
                    <input type="text" placeholder="0x... (optional — open job)" value={form.provider}
                      onChange={e => setForm(f => ({...f, provider: e.target.value}))} style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ EVALUATOR ADDRESS (optional)</div>
                    <input type="text" placeholder="0x... (defaults to you)" value={form.evaluator}
                      onChange={e => setForm(f => ({...f, evaluator: e.target.value}))} style={inputStyle} />
                  </div>
                  <div>
                    <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)", marginBottom: 6 }}>▸ TASK DESCRIPTION</div>
                    <textarea placeholder="Describe the task..." required value={form.description}
                      onChange={e => setForm(f => ({...f, description: e.target.value}))}
                      style={{ ...inputStyle, height: 80, resize: "none" }} />
                  </div>

                  {/* Budget slider */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)" }}>▸ BUDGET</div>
                      <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 16,
                        fontWeight: 700, color: "var(--green)" }}>{form.amount} USDC</span>
                    </div>
                    <input type="range" min="0.5" max="50" step="0.5" value={form.amount}
                      onChange={e => setForm(f => ({...f, amount: e.target.value}))}
                      style={{ width: "100%", accentColor: "var(--green)", height: 4 }} />
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9, color: "var(--text-muted)", marginTop: 4 }}>
                      <span>0.5 USDC</span><span>25 USDC</span><span>50 USDC</span>
                    </div>
                  </div>

                  {/* Duration slider */}
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                      <div style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text-muted)" }}>▸ DURATION</div>
                      <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 16,
                        fontWeight: 700, color: "var(--cyan)" }}>{form.days} DAYS</span>
                    </div>
                    <input type="range" min="1" max="30" step="1" value={form.days}
                      onChange={e => setForm(f => ({...f, days: e.target.value}))}
                      style={{ width: "100%", accentColor: "var(--cyan)", height: 4 }} />
                  </div>

                  {/* Fee info */}
                  <div style={{ padding: "10px 12px", background: "var(--surface2)",
                    border: "1px solid var(--border)", fontSize: 10, color: "var(--text-muted)",
                    display: "flex", justifyContent: "space-between" }}>
                    <span>Platform fee (0.25%)</span>
                    <span style={{ color: "var(--text)" }}>
                      {(parseFloat(form.amount) * 0.0025).toFixed(4)} USDC
                    </span>
                  </div>

                  {step !== "idle" && step !== "error" && (
                    <div style={{ padding: "10px 12px",
                      background: step === "done" ? "rgba(0,255,136,0.06)" : "var(--surface2)",
                      border: "1px solid " + (step === "done" ? "var(--green)" : "var(--border)"),
                      color: step === "done" ? "var(--green)" : "var(--text-dim)",
                      fontSize: 10, display: "flex", alignItems: "center", gap: 8 }}>
                      {step !== "done" && <span style={{ width: 8, height: 8,
                        border: "1px solid currentColor", borderTopColor: "transparent",
                        borderRadius: "50%", display: "inline-block",
                        animation: "spin 1s linear infinite" }} />}
                      {step === "approving" ? "Approving USDC..." : step === "creating" ? "Locking USDC in escrow..." : "✓ Job created & funded!"}
                      {step === "done" && txHash && (
                        <span style={{ marginLeft: "auto", fontSize: 9, color: "var(--text-muted)" }}>
                          {txHash.slice(0,14)}...
                        </span>
                      )}
                    </div>
                  )}
                  {step === "error" && (
                    <div style={{ padding: "10px 12px", background: "rgba(255,59,107,0.06)",
                      border: "1px solid var(--danger)", color: "var(--danger)", fontSize: 10 }}>
                      ✗ {error}
                    </div>
                  )}

                  <button type="submit" disabled={step === "approving" || step === "creating"} style={{
                    padding: 12, background: "var(--green-dim)", border: "1px solid var(--green)",
                    color: "var(--green)", fontFamily: "'Space Mono', monospace",
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.2em", cursor: "pointer",
                  }}>
                    {step === "idle" || step === "error" || step === "done"
                      ? "▸ CREATE & FUND ESCROW" : "PROCESSING..."}
                  </button>
                </div>
              </form>
            </Panel>

            {/* TX Steps */}
            <Panel title="Transaction Steps" accent="var(--cyan)">
              {/* Progress */}
              <div style={{ height: 3, background: "var(--surface2)" }}>
                <div style={{ height: "100%", background: "var(--cyan)", transition: "width 0.5s",
                  width: step === "done" ? "100%" : step === "creating" ? "66%" : step === "approving" ? "33%" : "0%",
                  boxShadow: "0 0 8px var(--cyan)" }} />
              </div>

              {STEPS.map((s, i) => {
                const isDone = step === "done" || (step === "creating" && i === 0)
                const isActive = step === s.key
                return (
                  <div key={s.key} style={{ display: "flex", gap: 14, padding: "16px",
                    borderBottom: "1px solid var(--border)",
                    background: isActive ? "rgba(0,212,255,0.04)" : "transparent" }}>
                    <div style={{ width: 28, height: 28, border: "1.5px solid " + (isDone ? "var(--green)" : isActive ? "var(--cyan)" : "var(--border)"),
                      display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      color: isDone ? "var(--green)" : isActive ? "var(--cyan)" : "var(--text-muted)",
                      fontFamily: "'Orbitron', monospace", fontSize: 12, fontWeight: 700,
                      background: isDone ? "rgba(0,255,136,0.1)" : "transparent" }}>
                      {isDone ? "✓" : i + 1}
                    </div>
                    <div>
                      <div style={{ fontSize: 11, fontFamily: "'Orbitron', monospace", fontWeight: 700,
                        color: isDone ? "var(--text)" : isActive ? "var(--text)" : "var(--text-muted)",
                        marginBottom: 3 }}>{s.label}</div>
                      <div style={{ fontSize: 10, color: "var(--text-dim)" }}>{s.desc}</div>
                    </div>
                  </div>
                )
              })}

              <div style={{ padding: 14, background: "#000814",
                fontFamily: "'Space Mono', monospace", fontSize: 10, lineHeight: 1.7 }}>
                <div style={{ color: "var(--text-muted)" }}>$ neturion-escrow --arc-testnet</div>
                <div style={{ color: "var(--cyan)" }}>→ {NETURION_ESCROW.slice(0,16)}...</div>
                {step !== "idle" && (
                  <div style={{ color: step === "done" ? "var(--green)" : "var(--amber)" }}>
                    → {step === "done" ? "escrow funded ✓" : step + "..."}
                  </div>
                )}
              </div>
            </Panel>
          </div>
        )
      )}
      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <a href="/neturion-whitepaper.pdf"
          target="_blank" rel="noreferrer" style={{
            padding: "8px 16px", background: "transparent",
            border: "1px solid var(--border)", color: "var(--text-muted)",
            fontFamily: "'Space Mono', monospace", fontSize: 10,
            letterSpacing: "0.14em", textDecoration: "none",
          }}>📄 WHITEPAPER ↗</a>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </PageShell>
  )
}
