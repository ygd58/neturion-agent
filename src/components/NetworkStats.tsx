"use client"
import { usePublicClient } from "wagmi"
import { useEffect, useState } from "react"
import { CONTRACTS } from "@/lib/arc"
import { NT } from "@/lib/tokens"

const JOB_CREATED_TOPIC = "0xb0f0239bfdd96453e24733e18bfc24b70d8fadf123dd977473518dd577ee79b9" as `0x${string}`
const JOB_COMPLETED_TOPIC = "0x0fd54bd364fa9e67f17b091aefe930932c09fe7651cf5ad02c71a418f3341444" as `0x${string}`
const TRANSFER_EVENT = {
  type: "event" as const, name: "Transfer",
  inputs: [
    { type: "address" as const, name: "from", indexed: true },
    { type: "address" as const, name: "to", indexed: true },
    { type: "uint256" as const, name: "tokenId", indexed: true },
  ],
}

export default function NetworkStats() {
  const client = usePublicClient()
  const [stats, setStats] = useState({ agents: 0, jobs: 0, completed: 0, block: 0, rate: "N/A" })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!client) return
    async function load() {
      try {
        const latest = await (client as any).getBlockNumber()
        const fromBlock = latest > 9000n ? latest - 9000n : 0n
        const [mintLogs, jobLogs, completedLogs] = await Promise.all([
          (client as any).getLogs({ address: CONTRACTS.IDENTITY_REGISTRY, event: TRANSFER_EVENT, fromBlock, toBlock: latest }),
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_CREATED_TOPIC], fromBlock, toBlock: latest }),
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_COMPLETED_TOPIC], fromBlock, toBlock: latest }),
        ])
        const agents = mintLogs.filter((l: any) => l.args?.from === "0x0000000000000000000000000000000000000000").length
        const jobs = jobLogs.length
        const completed = completedLogs.length
        const rate = jobs > 0 ? ((completed / jobs) * 100).toFixed(0) + "%" : "N/A"
        setStats({ agents, jobs, completed, block: Number(latest), rate })
      } catch {}
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 15000)
    return () => clearInterval(interval)
  }, [client])

  const cards = [
    { label: "AGENTS", value: stats.agents, color: "var(--green)" },
    { label: "JOBS CREATED", value: stats.jobs, color: "var(--cyan)" },
    { label: "COMPLETED", value: stats.completed, color: "var(--green)" },
    { label: "SUCCESS RATE", value: stats.rate, color: "var(--green)" },
    { label: "BLOCK", value: "#" + stats.block.toLocaleString(), color: "var(--text)"Muted },
  ]

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "repeat(2, 1fr)",
      gap: 8,
    }}>
      {cards.map((card, i) => (
        <div key={card.label} style={{
          padding: "12px 14px",
          border: "1px solid var(--border)",
          background: "var(--surface)",
          gridColumn: i === 4 ? "1 / -1" : "auto",
        }}>
          <p style={{ fontSize: 9, letterSpacing: "0.2em", color: "var(--text)"Muted,
            textTransform: "uppercase", marginBottom: 6 }}>{card.label}</p>
          <p style={{
            color: loading ? NT.border : card.color,
            fontSize: i === 4 ? 14 : 22,
            fontFamily: "'Orbitron', monospace",
            fontWeight: 700, letterSpacing: "0.04em",
            textShadow: loading ? "none" : `0 0 10px ${card.color}44`,
          }}>
            {loading ? "..." : card.value}
          </p>
        </div>
      ))}
    </div>
  )
}
