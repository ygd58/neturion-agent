"use client"
import { useEffect, useState } from "react"
import { usePublicClient } from "wagmi"
import { Panel } from "@/components/atoms"
import { NT } from "@/lib/tokens"
import { CONTRACTS } from "@/lib/arc"

const JOB_CREATED_TOPIC = "0xb0f0239bfdd96453e24733e18bfc24b70d8fadf123dd977473518dd577ee79b9"
const JOB_COMPLETED_TOPIC = "0x0fd54bd364fa9e67f17b091aefe930932c09fe7651cf5ad02c71a418f3341444"
const JOB_FUNDED_TOPIC = "0xe3fbcc1ea1bdc559ec7f0347efde7655e58b5f45a30b0e4470a583c3ef5496b3"
const JOB_SUBMITTED_TOPIC = "0x80c17db79857f338a6a6df68a6883ecc0ce78e2202fe61ed979733573f40538e"

const TRANSFER_TOPIC = "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"

type Event = { type: string; color: string; msg: string; block: string; tx: string; age: number }

function timeAgo(seconds: number): string {
  if (seconds < 60) return seconds + "s ago"
  if (seconds < 3600) return Math.floor(seconds / 60) + "m ago"
  return Math.floor(seconds / 3600) + "h ago"
}

export default function EventFeed() {
  const client = usePublicClient()
  const [events, setEvents] = useState<Event[]>([])
  const [lastBlock, setLastBlock] = useState<bigint | null>(null)

  useEffect(() => {
    if (!client) return

    async function poll() {
      try {
        const latest = await (client as any).getBlockNumber()
        if (lastBlock !== null && latest <= lastBlock) return

        const fromBlock = lastBlock ? lastBlock + 1n : latest - 5n
        const toBlock = latest

        const logs = await (client as any).getLogs({
          address: CONTRACTS.AGENTIC_COMMERCE,
          fromBlock,
          toBlock,
        })

        const agentLogs = await (client as any).getLogs({
          address: CONTRACTS.IDENTITY_REGISTRY,
          topics: [TRANSFER_TOPIC],
          fromBlock,
          toBlock,
        })

        const newEvents: Event[] = []

        for (const log of logs) {
          const t0 = log.topics[0]
          const jobId = log.topics[1] ? BigInt(log.topics[1]).toString() : "?"
          const block = log.blockNumber?.toString() ?? "?"
          const tx = log.transactionHash?.slice(0, 12) + "..." ?? ""

          if (t0 === JOB_CREATED_TOPIC) newEvents.push({ type: "JobCreated", color: NT.cyan, msg: `Job #${jobId} created`, block, tx, age: 0 })
          else if (t0 === JOB_FUNDED_TOPIC) newEvents.push({ type: "JobFunded", color: NT.green, msg: `Job #${jobId} funded`, block, tx, age: 0 })
          else if (t0 === JOB_SUBMITTED_TOPIC) newEvents.push({ type: "JobSubmitted", color: NT.amber, msg: `Job #${jobId} submitted`, block, tx, age: 0 })
          else if (t0 === JOB_COMPLETED_TOPIC) newEvents.push({ type: "JobCompleted", color: NT.green, msg: `Job #${jobId} completed ✓`, block, tx, age: 0 })
        }

        for (const log of agentLogs) {
          const from = log.topics[1] ? "0x" + log.topics[1].slice(-40) : ""
          if (from === "0x0000000000000000000000000000000000000000") {
            const tokenId = log.topics[3] ? BigInt(log.topics[3]).toString() : "?"
            newEvents.push({ type: "AgentMinted", color: NT.green, msg: `Agent #${tokenId} registered`, block: log.blockNumber?.toString() ?? "?", tx: log.transactionHash?.slice(0,12) + "..." ?? "", age: 0 })
          }
        }

        if (newEvents.length > 0) {
          setEvents(prev => [...newEvents, ...prev].slice(0, 25))
        }

        setLastBlock(latest)
      } catch {}
    }

    poll()
    const id = setInterval(() => {
      setEvents(prev => prev.map(e => ({ ...e, age: e.age + 5 })))
      poll()
    }, 5000)

    return () => clearInterval(id)
  }, [client])

  return (
    <Panel title="Event Stream · Live" accent={NT.cyan}
      action={<span style={{ color: NT.green, fontSize: 9, display: "flex", alignItems: "center", gap: 4 }}>
        <span style={{ width: 6, height: 6, borderRadius: "50%", background: NT.green,
          animation: "pulse-dot 2s infinite", display: "inline-block" }} />
        LIVE
      </span>}
      style={{ display: "flex", flexDirection: "column", height: 480 }}>
      <div style={{ flex: 1, overflow: "auto" }}>
        {events.length === 0 ? (
          <div style={{ padding: "24px 14px", color: NT.textMuted,
            fontSize: 10, letterSpacing: "0.14em", textAlign: "center" }}>
            <div style={{ marginBottom: 8 }}>Scanning Arc Testnet...</div>
            <div style={{ color: NT.border, animation: "blink 1s step-end infinite",
              fontSize: 16 }}>█</div>
          </div>
        ) : events.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px",
            borderBottom: `1px solid ${NT.border}`, alignItems: "flex-start",
            animation: i === 0 ? "fadeSlideIn 0.3s ease" : "none",
            opacity: Math.max(0.4, 1 - e.age / 300) }}>
            <div style={{ flexShrink: 0, textAlign: "right", minWidth: 32 }}>
              <div style={{ fontSize: 9, color: NT.textMuted, letterSpacing: "0.06em" }}>
                {timeAgo(e.age)}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.12em",
                color: e.color, fontWeight: 700, marginBottom: 2 }}>
                {e.type}
              </div>
              <div style={{ fontSize: 12, color: NT.text }}>{e.msg}</div>
              <div style={{ fontSize: 9, color: NT.textMuted, marginTop: 2,
                fontFamily: "'Space Mono', monospace" }}>
                Block #{e.block} · {e.tx}
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 14px", borderTop: `1px solid ${NT.border}`,
        fontSize: 9, letterSpacing: "0.12em", color: NT.textMuted,
        display: "flex", justifyContent: "space-between" }}>
        <span>tail -f arc:5042002</span>
        <span style={{ color: NT.green }}>▸ polling every 5s</span>
      </div>
    </Panel>
  )
}
