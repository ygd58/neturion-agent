"use client"
import { useEffect, useState } from "react"
import { usePublicClient } from "wagmi"
import { Panel } from "@/components/atoms"
import { NT } from "@/lib/tokens"

const JOB_CREATED_TOPIC = "0xb0f0239bfdd96453e24733e18bfc24b70d8fadf123dd977473518dd577ee79b9" as `0x${string}`
const JOB_COMPLETED_TOPIC = "0x0fd54bd364fa9e67f17b091aefe930932c09fe7651cf5ad02c71a418f3341444" as `0x${string}`
const JOB_FUNDED_TOPIC = "0xe3fbcc1ea1bdc559ec7f0347efde7655e58b5f45a30b0e4470a583c3ef5496b3" as `0x${string}`
import { CONTRACTS } from "@/lib/arc"

type Event = { type: string; color: string; msg: string; time: string; tx: string }

export default function EventFeed() {
  const client = usePublicClient()
  const [events, setEvents] = useState<Event[]>([])

  useEffect(() => {
    if (!client) return
    let stopped = false

    const unwatch = client.watchBlocks({
      onBlock: async (block) => {
        if (stopped) return
        const logs = await (client as any).getLogs({
          address: CONTRACTS.AGENTIC_COMMERCE,
          fromBlock: block.number,
          toBlock: block.number,
        })
        const newEvents: Event[] = logs.map(log => {
          const t0 = log.topics[0]
          const jobId = log.topics[1] ? BigInt(log.topics[1]).toString() : "?"
          if (t0 === JOB_CREATED_TOPIC) return { type: "JobCreated", color: NT.cyan, msg: `JOB #${jobId} created`, time: "now", tx: log.transactionHash?.slice(0,10) ?? "" }
          if (t0 === JOB_COMPLETED_TOPIC) return { type: "JobCompleted", color: NT.green, msg: `JOB #${jobId} completed`, time: "now", tx: log.transactionHash?.slice(0,10) ?? "" }
          if (t0 === JOB_FUNDED_TOPIC) return { type: "JobFunded", color: NT.amber, msg: `JOB #${jobId} funded`, time: "now", tx: log.transactionHash?.slice(0,10) ?? "" }
          return { type: "Event", color: NT.textDim, msg: `TX in block #${block.number}`, time: "now", tx: log.transactionHash?.slice(0,10) ?? "" }
        })
        if (newEvents.length > 0) {
          setEvents(prev => [...newEvents, ...prev].slice(0, 20))
        }
      }
    })

    return () => { stopped = true; unwatch() }
  }, [client])

  return (
    <Panel title="Event Stream · Live" accent={NT.cyan}
      action={<span style={{ color: NT.green, fontSize: 9 }}>● REC</span>}
      style={{ display: "flex", flexDirection: "column", height: 520 }}>
      <div style={{ flex: 1, overflow: "auto" }}>
        {events.length === 0 ? (
          <div style={{ padding: "20px 14px", color: NT.textMuted,
            fontSize: 10, letterSpacing: "0.14em", textAlign: "center" }}>
            <div style={{ marginBottom: 8 }}>Waiting for events...</div>
            <div style={{ color: NT.border, animation: "blink 1s step-end infinite" }}>█</div>
          </div>
        ) : events.map((e, i) => (
          <div key={i} style={{ display: "flex", gap: 10, padding: "10px 14px",
            borderBottom: `1px solid ${NT.border}`, alignItems: "flex-start",
            animation: i === 0 ? "fadeSlideIn 0.3s ease" : "none" }}>
            <span style={{ width: 40, fontSize: 9.5, color: NT.textMuted,
              letterSpacing: "0.1em", flexShrink: 0 }}>{e.time}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.14em",
                color: e.color, fontWeight: 700 }}>{e.type}</div>
              <div style={{ fontSize: 11.5, color: NT.text, marginTop: 2 }}>{e.msg}</div>
              <div style={{ fontSize: 9.5, color: NT.textMuted, marginTop: 1 }}>
                {e.tx}...
              </div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: "8px 14px", borderTop: `1px solid ${NT.border}`,
        fontSize: 9.5, letterSpacing: "0.14em", color: NT.textMuted,
        display: "flex", justifyContent: "space-between" }}>
        <span>tail · -f arc:5042002</span>
        <span style={{ color: NT.green }}>▸ stream open</span>
      </div>
    </Panel>
  )
}
