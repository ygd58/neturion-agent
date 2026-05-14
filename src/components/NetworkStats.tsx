"use client"

import { usePublicClient } from "wagmi"
import { useEffect, useState } from "react"
import { CONTRACTS } from "@/lib/arc"

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
        const latest = await client!.getBlockNumber()
        const fromBlock = latest > 9000n ? latest - 9000n : 0n
        const [mintLogs, jobLogs, completedLogs] = await Promise.all([
          client!.getLogs({ address: CONTRACTS.IDENTITY_REGISTRY, event: TRANSFER_EVENT, fromBlock, toBlock: latest }),
          client!.getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_CREATED_TOPIC] as any, fromBlock, toBlock: latest }),
          client!.getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_COMPLETED_TOPIC] as any, fromBlock, toBlock: latest }),
        ])
        const agents = mintLogs.filter(l => (l.args as any).from === "0x0000000000000000000000000000000000000000").length
        const jobs = jobLogs.length
        const completed = completedLogs.length
        const rate = jobs > 0 ? ((completed / jobs) * 100).toFixed(0) + "%" : "N/A"
        setStats({ agents, jobs, completed, block: Number(latest), rate })
      } catch {}
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 10000)
    return () => clearInterval(interval)
  }, [client])

  const cards = [
    { label: "AGENTS", value: stats.agents, color: "#00ff88", prefix: "" },
    { label: "JOBS CREATED", value: stats.jobs, color: "#00ffff", prefix: "" },
    { label: "COMPLETED", value: stats.completed, color: "#00ff88", prefix: "" },
    { label: "SUCCESS RATE", value: stats.rate, color: stats.rate === "100%" ? "#00ff88" : "#ffaa00", prefix: "" },
    { label: "BLOCK HEIGHT", value: stats.block.toLocaleString(), color: "#004433", prefix: "#" },
  ]

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "8px" }}>
      {cards.map((card, i) => (
        <div key={card.label} className="terminal-border card-hover" style={{ padding: "12px 16px", background: "rgba(0,255,136,0.01)" }}>
          <p style={{ color: "#004433", fontSize: "0.55rem", letterSpacing: "0.2em", marginBottom: "8px" }}>{card.label}</p>
          <p style={{ 
            color: loading ? "#002211" : card.color, 
            fontSize: i === 4 ? "0.9rem" : "1.5rem",
            fontFamily: "var(--font-display)",
            letterSpacing: "0.05em",
            textShadow: loading ? "none" : "0 0 10px " + card.color + "44",
            transition: "all 0.3s"
          }}>
            {loading ? "..." : (card.prefix + card.value)}
          </p>
        </div>
      ))}
    </div>
  )
}
