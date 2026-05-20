"use client"
import { useState } from "react"
import { useAccount, useWriteContract, usePublicClient } from "wagmi"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import PageShell from "@/components/PageShell"
import { Panel } from "@/components/atoms"
import { CONTRACTS, IDENTITY_ABI } from "@/lib/arc"
import { NT, ROLES } from "@/lib/tokens"

const CAPABILITIES = [
  "html", "rag", "scrape", "python", "sql", "vision", "ocr",
  "embeddings", "summarize", "routing", "consensus", "audit",
  "translate", "evm", "geo", "etl", "planning", "safety"
]

export default function RegisterPage() {
  const { address, isConnected } = useAccount()
  const { writeContractAsync } = useWriteContract()
  const client = usePublicClient()

  const [form, setForm] = useState({
    name: "", role: "worker", capabilities: [] as string[], endpoint: ""
  })
  const [status, setStatus] = useState<"idle" | "pending" | "done" | "error">("idle")
  const [agentId, setAgentId] = useState("")
  const [error, setError] = useState("")
  const [txHash, setTxHash] = useState("")

  const metadata = {
    name: form.name || "AGENT-NAME",
    role: form.role,
    capabilities: form.capabilities,
    endpoint: form.endpoint || undefined,
    version: "8004.1",
    owner: address,
    created: Math.floor(Date.now() / 1000),
  }

  const metadataURI = "data:application/json;base64," + btoa(JSON.stringify(metadata))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!address || !client) return
    setStatus("pending"); setError("")
    try {
      const hash = await (writeContractAsync as any)({
        address: CONTRACTS.IDENTITY_REGISTRY,
        abi: IDENTITY_ABI,
        functionName: "register",
        args: [metadataURI],
      })
      setTxHash(hash)
      const receipt = await client.waitForTransactionReceipt({ hash })
      const id = receipt.logs[0]?.topics[3] ? BigInt(receipt.logs[0].topics[3]).toString() : "?"
      setAgentId(id)
      setStatus("done")
    } catch (e: any) {
      setError(e.shortMessage ?? e.message ?? "TX FAILED"); setStatus("error")
    }
  }

  const toggleCap = (cap: string) => {
    setForm(f => ({
      ...f,
      capabilities: f.capabilities.includes(cap)
        ? f.capabilities.filter(c => c !== cap)
        : f.capabilities.length < 8 ? [...f.capabilities, cap] : f.capabilities
    }))
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", background: NT.surface2, border: `1px solid ${NT.borderHi}`,
    color: NT.text, fontFamily: "'Space Mono', monospace",
    fontSize: 12.5, letterSpacing: "0.04em", outline: "none", padding: "11px 14px",
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 10, letterSpacing: "0.2em", color: NT.textDim,
    textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 6
  }

  return (
    <PageShell>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.32em", color: NT.green }}>▸ ./registry / new</div>
        <h1 style={{ margin: "6px 0 4px", fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 800, letterSpacing: "0.08em", color: NT.text, textTransform: "uppercase" }}>
          Register <span style={{ color: NT.green }}>Agent</span>
        </h1>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", color: NT.textDim }}>
          IdentityRegistry.register(metadataURI) · ERC-8004
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 14 }}>
          {/* Form */}
          <Panel title="Agent Manifest" accent={NT.green}>
            <form onSubmit={handleSubmit}>
              <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={labelStyle}>▸ Agent Name</label>
                  <input type="text" placeholder="AGENT-NAME" value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value.toUpperCase() }))}
                    style={inputStyle} required maxLength={24} />
                  <div style={{ fontSize: 9.5, color: NT.textMuted, marginTop: 4, letterSpacing: "0.1em" }}>
                    UPPERCASE · 3–24 CHARS
                  </div>
                </div>

                {/* Role select */}
                <div>
                  <label style={labelStyle}>▸ Role · select one</label>
                  <div style={{ display: "flex", gap: 10 }}>
                    {Object.entries(ROLES).map(([role, r]) => (
                      <div key={role} onClick={() => setForm(f => ({ ...f, role }))}
                        style={{
                          flex: 1, padding: 14, cursor: "pointer",
                          background: form.role === role ? `${r.color}10` : NT.surface2,
                          border: `1px solid ${form.role === role ? r.color : NT.border}`,
                          boxShadow: form.role === role ? `0 0 12px ${r.color}22 inset` : "none",
                          transition: "all 0.2s",
                        }}>
                        <div style={{ fontSize: 20, color: r.color, marginBottom: 8 }}>{r.glyph}</div>
                        <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 12,
                          fontWeight: 700, letterSpacing: "0.1em",
                          color: form.role === role ? r.color : NT.text, textTransform: "uppercase" }}>
                          {role}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Capabilities */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>▸ Capabilities · 1–8</label>
                    <span style={{ fontSize: 9.5, color: NT.textMuted, letterSpacing: "0.1em" }}>
                      {form.capabilities.length} / 8
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {CAPABILITIES.map(cap => {
                      const on = form.capabilities.includes(cap)
                      return (
                        <span key={cap} onClick={() => toggleCap(cap)} style={{
                          padding: "6px 10px", cursor: "pointer",
                          background: on ? `${NT.green}14` : NT.surface2,
                          color: on ? NT.green : NT.textDim,
                          border: `1px solid ${on ? NT.green + "66" : NT.border}`,
                          fontSize: 10.5, letterSpacing: "0.1em", fontWeight: 700,
                          transition: "all 0.15s"
                        }}>
                          {on ? "✓" : "+"} {cap}
                        </span>
                      )
                    })}
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>▸ Endpoint URI (optional)</label>
                  <input type="text" placeholder="wss://your-agent-endpoint.io/..."
                    value={form.endpoint}
                    onChange={e => setForm(f => ({ ...f, endpoint: e.target.value }))}
                    style={inputStyle} />
                </div>

                {status === "done" && (
                  <div style={{ padding: "14px 16px", background: `${NT.green}0a`,
                    border: `1px solid ${NT.green}44`, color: NT.green,
                    fontSize: 12, letterSpacing: "0.1em", textAlign: "center" }}>
                    ✓ AGENT #{agentId} REGISTERED
                    <a href={"https://testnet.arcscan.app/token/" + CONTRACTS.IDENTITY_REGISTRY + "/instance/" + agentId}
                      target="_blank" rel="noreferrer"
                      style={{ display: "block", color: NT.textMuted, fontSize: 10, marginTop: 8, textDecoration: "none" }}>
                      VIEW ON EXPLORER →
                    </a>
                  </div>
                )}
                {status === "error" && (
                  <div style={{ padding: "14px 16px", background: `${NT.danger}0a`,
                    border: `1px solid ${NT.danger}44`, color: NT.danger, fontSize: 11 }}>
                    ✗ {error}
                  </div>
                )}

                <button type="submit"
                  disabled={status === "pending" || !form.name || form.capabilities.length === 0}
                  style={{
                    padding: "13px", background: `${NT.green}14`,
                    border: `1px solid ${NT.green}66`, color: NT.green,
                    fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700,
                    letterSpacing: "0.2em", cursor: "pointer", width: "100%",
                  }}>
                  {status === "pending" ? "REGISTERING..." : "▸ SIGN & REGISTER AGENT"}
                </button>
              </div>
            </form>
          </Panel>

          {/* Metadata preview */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <Panel title="Metadata · base64(JSON)" accent={NT.cyan}
              action={<span style={{ color: NT.textMuted, fontSize: 10 }}>0x8004…BD9e</span>}
              style={{ flex: 1 }}>
              <div style={{ margin: 0, padding: "14px 16px",
                fontFamily: "'Space Mono', monospace", fontSize: 11, lineHeight: 1.8,
                color: NT.text, background: "var(--bg)",
                borderTop: `1px solid ${NT.border}` }}>
                <div><span style={{ color: NT.textMuted }}>{"{"}</span></div>
                <div style={{ paddingLeft: 16 }}>
                  <span style={{ color: NT.cyan }}>"name"</span>: <span style={{ color: NT.green }}>"{form.name || "AGENT-NAME"}"</span>,
                </div>
                <div style={{ paddingLeft: 16 }}>
                  <span style={{ color: NT.cyan }}>"role"</span>: <span style={{ color: NT.green }}>"{form.role}"</span>,
                </div>
                <div style={{ paddingLeft: 16 }}>
                  <span style={{ color: NT.cyan }}>"capabilities"</span>: [
                  {form.capabilities.map((c, i) => (
                    <div key={c} style={{ paddingLeft: 16 }}>
                      <span style={{ color: NT.green }}>"{c}"</span>{i < form.capabilities.length - 1 ? "," : ""}
                    </div>
                  ))}
                  ],
                </div>
                <div style={{ paddingLeft: 16 }}>
                  <span style={{ color: NT.cyan }}>"version"</span>: <span style={{ color: NT.amber }}>"8004.1"</span>,
                </div>
                <div style={{ paddingLeft: 16 }}>
                  <span style={{ color: NT.cyan }}>"owner"</span>: <span style={{ color: NT.green }}>"{address ? address.slice(0,10) + "..." + address.slice(-6) : "0x..."}"</span>
                </div>
                <div><span style={{ color: NT.textMuted }}>{"}"}</span></div>
              </div>
              <div style={{ padding: "8px 14px", borderTop: `1px solid ${NT.border}`,
                display: "flex", justifyContent: "space-between",
                fontSize: 10, color: NT.textMuted, letterSpacing: "0.12em" }}>
                <span>{JSON.stringify(metadata).length} BYTES</span>
              </div>
            </Panel>

            <Panel accent={NT.green}>
              <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 8 }}>
                {[
                  ["EST. GAS", "~ 0.38 USDC"],
                  ["REGISTRY", "ERC-8004 v1"],
                  ["ANTI-SELF-DEAL", "ERC-8004 §4.2 active"],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between",
                    fontSize: 11, color: NT.textDim, letterSpacing: "0.06em" }}>
                    <span>{k}</span>
                    <span style={{ color: NT.text }}>{v}</span>
                  </div>
                ))}
                {txHash && (
                  <div style={{ marginTop: 4, fontSize: 10, color: NT.textMuted, letterSpacing: "0.06em" }}>
                    TX <span style={{ color: NT.cyan }}>{txHash.slice(0,20)}…</span>
                  </div>
                )}
              </div>
            </Panel>
          </div>
        </div>
      )}
    </PageShell>
  )
}
