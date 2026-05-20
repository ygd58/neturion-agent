"use client"
import { useState } from "react"
import { useAccount, useWriteContract, usePublicClient } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import PageShell from "@/components/PageShell"
import AgentPicker from "@/components/AgentPicker"
import Confetti from "@/components/Confetti"
import { Panel } from "@/components/atoms"
import { parseUSDC, CONTRACTS, COMMERCE_ABI, USDC_ABI } from "@/lib/arc"
import { NT } from "@/lib/tokens"

type Status = "idle" | "approving" | "creating" | "budgeting" | "funding" | "done" | "error"

const STEPS = [
  { n: 1, key: "approving",  label: "APPROVE USDC",  sub: "Allow the contract to spend your USDC" },
  { n: 2, key: "creating",   label: "CREATE JOB",    sub: "Register the job onchain with provider and description" },
  { n: 3, key: "budgeting",  label: "SET BUDGET",    sub: "Lock the USDC budget amount for this job" },
  { n: 4, key: "funding",    label: "FUND ESCROW",   sub: "Transfer USDC into escrow — provider can now claim" },
]

export default function CreatePage() {
  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const client = usePublicClient()
  const [form, setForm] = useState({ provider: "", description: "", budget: "1.0", days: "7" })
  const [status, setStatus] = useState<Status>("idle")
  const [jobId, setJobId] = useState("")
  const [showConfetti, setShowConfetti] = useState(false)
  const [error, setError] = useState("")
  const [txHashes, setTxHashes] = useState<Record<string, string>>({})

  const currentStep = STEPS.findIndex(s => s.key === status)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!address || !client) return
    setStatus("approving"); setError("")
    try {
      const budget = parseUSDC(form.budget)
      const expiredAt = BigInt(Math.floor(Date.now() / 1000) + parseInt(form.days) * 86400)

      const h1 = await (writeContractAsync as any)({ address: CONTRACTS.USDC, abi: USDC_ABI, functionName: "approve", args: [CONTRACTS.AGENTIC_COMMERCE, budget] })
      setTxHashes(t => ({ ...t, approving: h1 }))

      setStatus("creating")
      const h2 = await (writeContractAsync as any)({
        address: CONTRACTS.AGENTIC_COMMERCE, abi: COMMERCE_ABI, functionName: "createJob",
        args: [form.provider as `0x${string}`, address, expiredAt, form.description, "0x0000000000000000000000000000000000000000"],
      })
      setTxHashes(t => ({ ...t, creating: h2 }))
      const receipt = await client.waitForTransactionReceipt({ hash: h2 })
      const id = receipt.logs[0]?.topics[1] ? BigInt(receipt.logs[0].topics[1]).toString() : "?"
      setJobId(id)

      setStatus("budgeting")
      const h3 = await (writeContractAsync as any)({ address: CONTRACTS.AGENTIC_COMMERCE, abi: COMMERCE_ABI, functionName: "setBudget", args: [BigInt(id), budget, "0x"] })
      setTxHashes(t => ({ ...t, budgeting: h3 }))

      setStatus("funding")
      const h4 = await (writeContractAsync as any)({ address: CONTRACTS.AGENTIC_COMMERCE, abi: COMMERCE_ABI, functionName: "fund", args: [BigInt(id), "0x"] })
      setTxHashes(t => ({ ...t, funding: h4 }))

      setStatus("done")
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 3000)
    } catch (e: any) {
      setError(e.shortMessage ?? e.message ?? "TX FAILED"); setStatus("error")
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: NT.surface2, border: `1px solid ${NT.borderHi}`,
    color: NT.text, fontFamily: "'Space Mono', monospace",
    fontSize: 12.5, letterSpacing: "0.04em", outline: "none", padding: "11px 14px",
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10, letterSpacing: "0.2em", color: NT.textDim,
    textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 6,
  }

  return (
    <PageShell>
      <Confetti trigger={showConfetti} />
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.32em", color: NT.green }}>▸ ./commerce / new</div>
        <h1 style={{ margin: "6px 0 4px", fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 800, letterSpacing: "0.08em", color: NT.text, textTransform: "uppercase" }}>
          Create <span style={{ color: NT.green }}>Job</span>
        </h1>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", color: NT.textDim }}>
          4-step atomic commit · approve → createJob → setBudget → fund
        </div>
      </div>

      {!isConnected ? (
        <div style={{ padding: 40, textAlign: "center", border: `1px solid ${NT.border}` }}>
          <p style={{ color: NT.textDim, fontSize: 11, letterSpacing: "0.14em", marginBottom: 20 }}>
            WALLET CONNECTION REQUIRED
          </p>
          <ConnectButton />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 400px", gap: 14 }}>
          {/* Form */}
          <Panel title="Job Specification" accent={NT.green}
            style={{ display: "flex", flexDirection: "column" }}>
            <form onSubmit={handleSubmit}>
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>▸ Provider Agent</label>
                  <AgentPicker onSelect={(addr, name) => setForm(f => ({ ...f, provider: addr }))} />
                  <div style={{ marginTop: 6 }}>
                    <label style={{ ...labelStyle, marginBottom: 4 }}>OR PASTE ADDRESS</label>
                    <input type="text" placeholder="0x..." value={form.provider}
                      onChange={e => setForm(f => ({ ...f, provider: e.target.value }))}
                      style={inputStyle} />
                  </div>
                </div>
                <div>
                  <label style={labelStyle}>▸ Task Description</label>
                  <textarea placeholder="Describe the task..." value={form.description}
                    onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                    style={{ ...inputStyle, height: 100, resize: "none" }} required />
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={labelStyle}>▸ Budget</label>
                    <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 16,
                      fontWeight: 700, color: NT.green }}>{form.budget} USDC</span>
                  </div>
                  <input type="range" min="0.5" max="100" step="0.5"
                    value={form.budget}
                    onChange={e => setForm(f => ({ ...f, budget: e.target.value }))}
                    style={{ width: "100%", accentColor: NT.green, cursor: "pointer", height: 4 }} />
                  <div style={{ display: "flex", justifyContent: "space-between",
                    fontSize: 9, color: NT.textMuted, letterSpacing: "0.1em", marginTop: 4 }}>
                    <span>0.5 USDC</span>
                    <span>50 USDC</span>
                    <span>100 USDC</span>
                  </div>
                </div>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={labelStyle}>▸ Duration</label>
                    <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 16,
                      fontWeight: 700, color: NT.cyan }}>{form.days} DAYS</span>
                  </div>
                  <input type="range" min="1" max="30" step="1"
                    value={form.days}
                    onChange={e => setForm(f => ({ ...f, days: e.target.value }))}
                    style={{ width: "100%", accentColor: NT.cyan, cursor: "pointer", height: 4 }} />
                  <div style={{ display: "flex", justifyContent: "space-between",
                    fontSize: 9, color: NT.textMuted, letterSpacing: "0.1em", marginTop: 4 }}>
                    <span>1 DAY</span>
                    <span>15 DAYS</span>
                    <span>30 DAYS</span>
                  </div>
                </div>

                {status === "done" ? (
                  <div style={{ padding: "14px 16px", background: `${NT.green}0a`,
                    border: `1px solid ${NT.green}44`, color: NT.green,
                    fontSize: 12, letterSpacing: "0.1em", textAlign: "center" }}>
                    ✓ JOB #{jobId} CREATED AND FUNDED
                    <a href={"https://testnet.arcscan.app"} target="_blank" rel="noreferrer"
                      style={{ display: "block", color: NT.textMuted, fontSize: 10,
                        marginTop: 8, textDecoration: "none" }}>
                      VIEW ON EXPLORER →
                    </a>
                  </div>
                ) : status === "error" ? (
                  <div style={{ padding: "14px 16px", background: `${NT.danger}0a`,
                    border: `1px solid ${NT.danger}44`, color: NT.danger,
                    fontSize: 11, letterSpacing: "0.08em" }}>
                    ✗ {error}
                  </div>
                ) : null}

                <button type="submit"
                  disabled={status !== "idle" && status !== "error" && status !== "done"}
                  style={{
                    padding: "13px", background: (status === "idle" || status === "error" || status === "done") ? `${NT.green}14` : `${NT.green}06`,
                    border: `1px solid ${(status === "idle" || status === "error" || status === "done") ? NT.green : NT.border}`,
                    color: (status === "idle" || status === "error" || status === "done") ? NT.green : NT.textMuted,
                    fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.2em", cursor: "pointer", width: "100%",
                  }}>
                  {status === "idle" || status === "error" || status === "done"
                    ? "▸ EXECUTE JOB CREATION"
                    : "PROCESSING..."}
                </button>
              </div>
            </form>
          </Panel>

          {/* TX Queue */}
          <Panel title="Transaction Queue" accent={NT.cyan}
            action={<span style={{ color: NT.cyan, fontSize: 10 }}>
              {status === "done" ? "4/4 · 100%" : status === "idle" ? "0/4 · 0%" : `${currentStep + 1}/4`}
            </span>}
            style={{ display: "flex", flexDirection: "column" }}>
            {/* Progress bar */}
            <div style={{ height: 3, background: NT.surface2 }}>
              <div style={{
                height: "100%", background: NT.cyan, transition: "width 0.5s ease",
                width: status === "done" ? "100%" : status === "idle" ? "0%" : `${((currentStep + 1) / 4) * 100}%`,
                boxShadow: `0 0 8px ${NT.cyan}`,
              }} />
            </div>

            {STEPS.map((step) => {
              const stepIdx = STEPS.findIndex(s => s.key === status)
              const isDone = status === "done" || (stepIdx > STEPS.indexOf(step))
              const isActive = step.key === status
              return (
                <div key={step.n} style={{
                  display: "flex", gap: 14, padding: "14px 16px",
                  borderBottom: `1px solid ${NT.border}`,
                  background: isActive ? `${NT.cyan}08` : "transparent",
                  position: "relative"
                }}>
                  {isActive && <span style={{ position: "absolute", left: 0, top: 0, bottom: 0,
                    width: 2, background: NT.cyan, boxShadow: `0 0 8px ${NT.cyan}` }} />}
                  <div style={{
                    width: 28, height: 28, border: `1.5px solid ${isDone ? NT.green : isActive ? NT.cyan : NT.border}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    flexShrink: 0, color: isDone ? NT.green : isActive ? NT.cyan : NT.textMuted,
                    fontFamily: "'Orbitron', monospace", fontSize: 12, fontWeight: 700,
                    background: isDone ? `${NT.green}14` : "transparent",
                  }}>
                    {isDone ? "✓" : step.n}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 12,
                        fontWeight: 700, letterSpacing: "0.06em",
                        color: isDone ? NT.text : isActive ? NT.text : NT.textMuted }}>
                        {step.label}
                      </span>
                      {isDone && <span style={{ fontSize: 9, padding: "2px 6px",
                        background: `${NT.green}14`, color: NT.green,
                        border: `1px solid ${NT.green}44`, letterSpacing: "0.1em" }}>DONE</span>}
                      {isActive && <span style={{ fontSize: 9, padding: "2px 6px",
                        background: `${NT.cyan}14`, color: NT.cyan,
                        border: `1px solid ${NT.cyan}44`, letterSpacing: "0.1em" }}>ACTIVE</span>}
                    </div>
                    <div style={{ fontSize: 10.5, color: NT.textDim, marginTop: 3, letterSpacing: "0.04em" }}>
                      {step.sub}
                    </div>
                    {txHashes[step.key] && (
                      <div style={{ marginTop: 6, fontSize: 10, color: NT.textMuted }}>
                        TX <span style={{ color: NT.cyan }}>{txHashes[step.key].slice(0, 14)}…</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}

            <div style={{ padding: 14, borderTop: `1px solid ${NT.border}`,
              background: "#000814", fontFamily: "'Space Mono', monospace",
              fontSize: 10.5, lineHeight: 1.6 }}>
              <div style={{ color: NT.textMuted }}>$ neturion-tx --network arc-testnet</div>
              <div style={{ color: NT.cyan }}>⟶ rpc.testnet.arc.network:443</div>
              {status !== "idle" && (
                <div style={{ color: status === "done" ? NT.green : NT.amber }}>
                  ⟶ {status === "done" ? `job #${jobId} confirmed` : `${status}...`}
                </div>
              )}
              <div style={{ color: NT.green, animation: status !== "idle" && status !== "done" ? "blink 1s step-end infinite" : "none" }}>
                {status !== "idle" && status !== "done" ? "█" : "▸"}
              </div>
            </div>
          </Panel>
        </div>
      )}
    </PageShell>
  )
}
