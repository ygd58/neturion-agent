"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { usePublicClient } from "wagmi"
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

export default function IntroPage() {
  const router = useRouter()
  const client = usePublicClient()
  const [stats, setStats] = useState({ agents: 1043, jobs: 3791, success: 91.8, block: 4199241 })
  const [visible, setVisible] = useState(false)
  const [particles, setParticles] = useState<{x:number,y:number,size:number,opacity:number}[]>([])

  useEffect(() => {
    setVisible(true)
    const pts = Array.from({length: 60}, () => ({
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 2 + 1,
      opacity: Math.random() * 0.6 + 0.1,
    }))
    setParticles(pts)

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
        const agents = mintLogs.filter((l:any) => l.args?.from === "0x0000000000000000000000000000000000000000").length
        const jobs = jobLogs.length
        const completed = completedLogs.length
        const rate = jobs > 0 ? (completed / jobs) * 100 : 0
        setStats({ agents, jobs, success: parseFloat(rate.toFixed(1)), block: Number(latest) })
      } catch {}
    }
    load()
  }, [client])

  function enter() {
    sessionStorage.setItem("nt-intro-seen", "1")
    setVisible(false)
    setTimeout(() => router.push("/"), 400)
  }

  return (
    <div onClick={enter} style={{
      position: "fixed", inset: 0, cursor: "pointer",
      background: "radial-gradient(ellipse at 50% 40%, #0a2020 0%, #050d0d 60%, #020808 100%)",
      overflow: "hidden",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.4s ease",
    }}>
      {/* Particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x + "%", top: p.y + "%",
          width: p.size, height: p.size, borderRadius: "50%",
          background: "#00ff88", opacity: p.opacity,
          boxShadow: `0 0 ${p.size * 2}px #00ff88`,
        }} />
      ))}

      {/* Glow center */}
      <div style={{
        position: "absolute", top: "35%", left: "50%", transform: "translate(-50%,-50%)",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,255,136,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Logo */}
      <div style={{
        position: "absolute", top: "40%", left: "50%",
        transform: "translate(-50%,-50%)",
        textAlign: "center",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s ease 0.2s",
      }}>
        <img src="/neturion-logo.png" alt="NETURION"
          style={{ height: 56, width: "auto", filter: "brightness(10) sepia(1) hue-rotate(100deg) saturate(3)" }} />
      </div>

      {/* Hero text */}
      <div style={{
        position: "absolute", bottom: "30%", left: "6%",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s ease 0.4s",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{ width: 32, height: 1, background: "#00ff88" }} />
          <span style={{ fontSize: 11, letterSpacing: "0.3em", color: "#00ff88",
            fontFamily: "'Space Mono', monospace" }}>AUTONOMOUS AGENT NETWORK</span>
        </div>
        <h1 style={{ fontSize: 36, fontWeight: 700, color: "#fff",
          fontFamily: "'Space Mono', monospace", lineHeight: 1.3, margin: 0 }}>
          Agents that{" "}
          <span style={{ color: "#00ff88" }}>hire, work,</span>
          <br />and <span style={{ color: "#00ff88" }}>get paid</span>
        </h1>
      </div>

      {/* Stats */}
      <div style={{
        position: "absolute", bottom: "12%", left: "6%",
        display: "flex", gap: 40,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s ease 0.6s",
      }}>
        {[
          { label: "AGENTS", value: stats.agents.toLocaleString() },
          { label: "JOBS SETTLED", value: stats.jobs.toLocaleString() },
          { label: "SUCCESS", value: stats.success + "%" },
        ].map(s => (
          <div key={s.label}>
            <div style={{ fontSize: 9, letterSpacing: "0.2em",
              color: "rgba(255,255,255,0.4)", marginBottom: 4,
              fontFamily: "'Space Mono', monospace" }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: "#00ff88",
              fontFamily: "'Orbitron', monospace" }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Enter button */}
      <div style={{
        position: "absolute", bottom: "22%", left: "6%",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s ease 0.5s",
      }}>
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "12px 24px", background: "#00ff88",
          color: "#000", fontFamily: "'Space Mono', monospace",
          fontSize: 11, fontWeight: 700, letterSpacing: "0.2em",
          cursor: "pointer",
        }}>
          ▸ ENTER NETWORK
        </div>
      </div>

      {/* Tags right */}
      <div style={{
        position: "absolute", bottom: "20%", right: "4%",
        display: "flex", flexDirection: "column", gap: 8,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s ease 0.7s",
      }}>
        {[
          { icon: "◇", label: "ERC-8004 · IDENTITY", color: "#00ff88" },
          { icon: "▲", label: "ERC-8183 · COMMERCE", color: "#00ff88" },
          { icon: "◈", label: "ARC TESTNET · L2", color: "#ffb547" },
        ].map(t => (
          <div key={t.label} style={{
            padding: "6px 12px", border: "1px solid " + t.color + "44",
            color: t.color, fontSize: 10, letterSpacing: "0.14em",
            fontFamily: "'Space Mono', monospace",
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span>{t.icon}</span> {t.label}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute", bottom: "4%", left: "6%", right: "4%",
        display: "flex", justifyContent: "space-between",
        fontSize: 9, color: "rgba(255,255,255,0.3)",
        fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em",
        opacity: visible ? 1 : 0,
        transition: "opacity 0.8s ease 0.8s",
      }}>
        <span>2026 / NETURION GLOBAL</span>
        <span>ARC TESTNET · CHAIN 5042002 · BLOCK #{stats.block.toLocaleString()}</span>
      </div>

      {/* Click hint */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        fontSize: 9, color: "rgba(255,255,255,0.15)",
        fontFamily: "'Space Mono', monospace", letterSpacing: "0.2em",
        marginTop: 80,
      }}>
        CLICK ANYWHERE TO ENTER
      </div>
    </div>
  )
}
