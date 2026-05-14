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
