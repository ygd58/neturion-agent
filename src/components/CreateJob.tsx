"use client"

import { useState } from "react"
import { useAccount, useWriteContract, usePublicClient } from "wagmi"
import { parseUSDC, CONTRACTS, COMMERCE_ABI, USDC_ABI } from "@/lib/arc"

type Status = "idle" | "approving" | "creating" | "funding" | "done" | "error"

export default function CreateJob() {
  const { address } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const client = usePublicClient()
  const [form, setForm] = useState({ provider: "", description: "", budget: "1.0", days: "7" })
  const [status, setStatus] = useState<Status>("idle")
  const [jobId, setJobId] = useState("")
  const [error, setError] = useState("")

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!address || !client) return
    setStatus("approving"); setError("")
    try {
      const budget = parseUSDC(form.budget)
      const expiredAt = BigInt(Math.floor(Date.now() / 1000) + parseInt(form.days) * 86400)
      await writeContractAsync({ address: CONTRACTS.USDC, abi: USDC_ABI, functionName: "approve", args: [CONTRACTS.AGENTIC_COMMERCE, budget] })
      setStatus("creating")
      const createHash = await writeContractAsync({
        address: CONTRACTS.AGENTIC_COMMERCE, abi: COMMERCE_ABI, functionName: "createJob",
        args: [form.provider as `0x${string}`, address, expiredAt, form.description, "0x0000000000000000000000000000000000000000"],
      })
      const receipt = await client.waitForTransactionReceipt({ hash: createHash })
      const id = receipt.logs[0]?.topics[1] ? BigInt(receipt.logs[0].topics[1]).toString() : "?"
      setJobId(id); setStatus("funding")
      await writeContractAsync({ address: CONTRACTS.AGENTIC_COMMERCE, abi: COMMERCE_ABI, functionName: "setBudget", args: [BigInt(id), budget, "0x"] })
      await writeContractAsync({ address: CONTRACTS.AGENTIC_COMMERCE, abi: COMMERCE_ABI, functionName: "fund", args: [BigInt(id), "0x"] })
      setStatus("done")
    } catch (e: any) {
      setError(e.shortMessage ?? e.message ?? "TX FAILED"); setStatus("error")
    }
  }

  const inputStyle = {
    width: "100%", background: "var(--bg)", border: "1px solid #004433", color: "var(--green)",
    padding: "8px 12px", fontSize: "0.75rem", fontFamily: "var(--font-mono)",
    outline: "none", letterSpacing: "0.05em",
  }

  const labelStyle = { color: "#004433", fontSize: "0.55rem", letterSpacing: "0.2em", display: "block", marginBottom: "4px" }

  return (
    <div className="terminal-border" style={{ padding: "20px", background: "rgba(0,255,136,0.01)" }}>
      <p style={{ color: "var(--green)", fontSize: "0.65rem", letterSpacing: "0.2em", marginBottom: "4px" }}>{">"} CREATE JOB</p>
      <p style={{ color: "#003322", fontSize: "0.55rem", letterSpacing: "0.1em", marginBottom: "20px" }}>ERC-8183 // USDC ESCROW</p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div>
          <label style={labelStyle}>PROVIDER ADDRESS</label>
          <input type="text" placeholder="0x..." value={form.provider}
            onChange={e => setForm(f => ({...f, provider: e.target.value}))}
            style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>TASK DESCRIPTION</label>
          <textarea placeholder="Describe the task..." value={form.description}
            onChange={e => setForm(f => ({...f, description: e.target.value}))}
            style={{ ...inputStyle, height: "80px", resize: "none" }} required />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          <div>
            <label style={labelStyle}>BUDGET (USDC)</label>
            <input type="number" step="0.1" min="0.1" value={form.budget}
              onChange={e => setForm(f => ({...f, budget: e.target.value}))}
              style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>DURATION (DAYS)</label>
            <input type="number" min="1" value={form.days}
              onChange={e => setForm(f => ({...f, days: e.target.value}))}
              style={inputStyle} />
          </div>
        </div>

        {status !== "idle" && (
          <div style={{
            padding: "10px 12px", fontSize: "0.65rem", letterSpacing: "0.1em",
            background: status === "done" ? "rgba(0,255,136,0.05)" : status === "error" ? "rgba(255,50,50,0.05)" : "rgba(0,255,136,0.02)",
            border: "1px solid " + (status === "done" ? "#004433" : status === "error" ? "#440000" : "#002211"),
            color: status === "done" ? "var(--green)" : status === "error" ? "#ff4444" : "#006633",
            display: "flex", alignItems: "center", gap: "8px"
          }}>
            {status !== "done" && status !== "error" && (
              <span style={{ width: "8px", height: "8px", border: "1px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 1s linear infinite" }} />
            )}
            {status === "approving" ? "APPROVING USDC..." : status === "creating" ? "CREATING JOB ONCHAIN..." : status === "funding" ? "LOCKING USDC ESCROW..." : status === "done" ? "JOB #" + jobId + " CREATED ✓" : error}
            {status === "done" && (
              <a href="https://testnet.arcscan.app" target="_blank" rel="noreferrer" style={{ color: "#004433", marginLeft: "auto", fontSize: "0.55rem" }}>EXPLORER →</a>
            )}
          </div>
        )}

        <button type="submit" disabled={status !== "idle" && status !== "error" && status !== "done"}
          style={{
            background: status === "idle" || status === "error" || status === "done" ? "rgba(0,255,136,0.1)" : "rgba(0,255,136,0.03)",
            border: "1px solid " + (status === "idle" || status === "error" || status === "done" ? "var(--green)" : "#002211"),
            color: status === "idle" || status === "error" || status === "done" ? "var(--green)" : "#004433",
            padding: "10px", fontSize: "0.65rem", letterSpacing: "0.2em",
            cursor: "pointer", width: "100%", fontFamily: "var(--font-mono)",
            transition: "all 0.2s",
          }}>
          {">"} {status === "idle" || status === "error" || status === "done" ? "EXECUTE JOB CREATION" : "PROCESSING..."}
        </button>
      </form>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
