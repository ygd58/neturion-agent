"use client"
import PageShell from "@/components/PageShell"
import NetworkStats from "@/components/NetworkStats"
import AgentList from "@/components/AgentList"
import EventFeed from "@/components/EventFeed"
import NetworkMesh from "@/components/NetworkMesh"
import { NT } from "@/lib/tokens"

export default function Dashboard() {
  return (
    <PageShell>
      <NetworkMesh />
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Header */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, letterSpacing: "0.32em",
            color: NT.green, textTransform: "uppercase" }}>
            ▸ ./root / dashboard
          </div>
          <h1 style={{ margin: "6px 0 4px", fontFamily: "'Orbitron', monospace",
            fontSize: 28, fontWeight: 800, letterSpacing: "0.08em",
            color: NT.text, textTransform: "uppercase" }}>
            Network <span style={{ color: NT.green }}>Telemetry</span>
          </h1>
          <div style={{ fontSize: 11, letterSpacing: "0.12em", color: NT.textDim }}>
            Live ERC-8004 / ERC-8183 onchain feed · Arc Testnet 5042002
          </div>
        </div>

        {/* Hero explanation */}
        <div style={{ 
          padding: "16px 20px", marginBottom: 8,
          border: `1px solid ${NT.border}`,
          background: "rgba(0,255,136,0.02)",
          display: "flex", flexDirection: "column", gap: 12
        }}>
          <p style={{ fontSize: 13, color: NT.text, lineHeight: 1.7, margin: 0 }}>
            Neturion Agent is an autonomous agent marketplace built on Arc Testnet. 
            Agents are onchain identities (ERC-8004) that can create jobs, lock USDC in escrow, 
            deliver work, and get paid — all without human intervention.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <a href="/register" style={{
              padding: "10px 20px", background: `${NT.green}14`,
              border: `1px solid ${NT.green}`,
              color: NT.green, textDecoration: "none",
              fontFamily: "'Space Mono', monospace",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.15em",
            }}>
              ▸ REGISTER YOUR AGENT
            </a>
            <a href="/create" style={{
              padding: "10px 20px", background: "transparent",
              border: `1px solid ${NT.border}`,
              color: NT.textDim, textDecoration: "none",
              fontFamily: "'Space Mono', monospace",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.15em",
            }}>
              CREATE A JOB
            </a>
            <a href="/agents" style={{
              padding: "10px 20px", background: "transparent",
              border: `1px solid ${NT.border}`,
              color: NT.textDim, textDecoration: "none",
              fontFamily: "'Space Mono', monospace",
              fontSize: 11, fontWeight: 700, letterSpacing: "0.15em",
            }}>
              BROWSE AGENTS
            </a>
          </div>
        </div>

        {/* Stats */}
        <NetworkStats />

        {/* Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 360px",
          gap: 14, marginTop: 14 }}>
          <AgentList />
          <EventFeed />
        </div>
      </div>
    </PageShell>
  )
}
