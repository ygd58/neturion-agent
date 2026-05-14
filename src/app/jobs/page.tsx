"use client"
import { usePublicClient } from "wagmi"
import { useEffect, useState } from "react"
import PageShell from "@/components/PageShell"
import { Panel, StatusPill, TH, TD } from "@/components/atoms"
import { CONTRACTS } from "@/lib/arc"
import { NT } from "@/lib/tokens"
import Link from "next/link"

const JOB_CREATED_TOPIC = "0xb0f0239bfdd96453e24733e18bfc24b70d8fadf123dd977473518dd577ee79b9" as `0x${string}`
const JOB_COMPLETED_TOPIC = "0x0fd54bd364fa9e67f17b091aefe930932c09fe7651cf5ad02c71a418f3341444" as `0x${string}`
const JOB_FUNDED_TOPIC = "0xe3fbcc1ea1bdc559ec7f0347efde7655e58b5f45a30b0e4470a583c3ef5496b3" as `0x${string}`

type Job = {
  id: string; status: string; client: string; provider: string; block: string; tx: string
}

export default function JobsPage() {
  const client = usePublicClient()
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("ALL")

  useEffect(() => {
    if (!client) return
    async function load() {
      const latest = await client!.getBlockNumber()
      const fromBlock = latest > 9000n ? latest - 9000n : 0n

      const [createdLogs, completedLogs, fundedLogs] = await Promise.all([
        (client! as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_CREATED_TOPIC], fromBlock, toBlock: latest }),
        (client! as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_COMPLETED_TOPIC], fromBlock, toBlock: latest }),
        (client! as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_FUNDED_TOPIC], fromBlock, toBlock: latest }),
      ])

      const completedIds = new Set(completedLogs.map(l => l.topics[1]))
      const fundedIds = new Set(fundedLogs.map(l => l.topics[1]))

      const loaded: Job[] = createdLogs.map(log => {
        const id = log.topics[1] ? BigInt(log.topics[1]).toString() : "?"
        const t1 = log.topics[1] ?? ""
        const status = completedIds.has(t1) ? "COMPLETED" : fundedIds.has(t1) ? "FUNDED" : "OPEN"
        const client_addr = log.topics[2] ? "0x" + log.topics[2].slice(-40) : "?"
        const provider_addr = log.topics[3] ? "0x" + log.topics[3].slice(-40) : "?"
        return {
          id, status,
          client: client_addr.slice(0,8) + "…" + client_addr.slice(-6),
          provider: provider_addr.slice(0,8) + "…" + provider_addr.slice(-6),
          block: log.blockNumber?.toString() ?? "?",
          tx: log.transactionHash?.slice(0,12) + "…" ?? "?",
        }
      }).reverse()

      setJobs(loaded)
      setLoading(false)
    }
    load()
  }, [client])

  const statusCounts = { ALL: jobs.length, OPEN: jobs.filter(j => j.status === "OPEN").length, FUNDED: jobs.filter(j => j.status === "FUNDED").length, COMPLETED: jobs.filter(j => j.status === "COMPLETED").length }
  const filtered = filter === "ALL" ? jobs : jobs.filter(j => j.status === filter)

  return (
    <PageShell>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.32em", color: NT.green }}>▸ ./commerce / jobs</div>
        <h1 style={{ margin: "6px 0 4px", fontFamily: "'Orbitron', monospace", fontSize: 28, fontWeight: 800, letterSpacing: "0.08em", color: NT.text, textTransform: "uppercase" }}>
          Job <span style={{ color: NT.green }}>Stream</span>
        </h1>
        <div style={{ fontSize: 11, letterSpacing: "0.12em", color: NT.textDim }}>
          ERC-8183 AgenticCommerce · {CONTRACTS.AGENTIC_COMMERCE}
        </div>
      </div>

      <div style={{ display: "flex", gap: 0, marginBottom: 14 }}>
        {Object.entries(statusCounts).map(([k, v], i) => {
          const colorMap: Record<string, string> = { ALL: NT.green, OPEN: NT.cyan, FUNDED: NT.green, COMPLETED: NT.text }
          const c = colorMap[k] ?? NT.textDim
          return (
            <button key={k} onClick={() => setFilter(k)} style={{
              padding: "10px 16px", cursor: "pointer",
              fontFamily: "'Space Mono', monospace", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em",
              background: filter === k ? `${c}14` : NT.surface,
              border: `1px solid ${filter === k ? c + "66" : NT.border}`,
              borderLeft: i === 0 ? `1px solid ${filter === k ? c + "66" : NT.border}` : "none",
              color: filter === k ? c : NT.textMuted,
              display: "flex", alignItems: "center", gap: 8,
            }}>
              {k} <span style={{ fontSize: 9.5, fontWeight: 400 }}>{v}</span>
            </button>
          )
        })}
        <div style={{ flex: 1 }} />
        <Link href="/create" style={{
          padding: "0 16px", background: `${NT.green}14`, border: `1px solid ${NT.green}66`,
          color: NT.green, fontFamily: "'Space Mono', monospace", fontSize: 11,
          fontWeight: 700, letterSpacing: "0.14em", textDecoration: "none",
          display: "flex", alignItems: "center"
        }}>+ CREATE JOB</Link>
      </div>

      <Panel accent={NT.cyan} style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", background: NT.surface2, borderBottom: `1px solid ${NT.borderHi}` }}>
          <TH w="90px">JOB ID</TH>
          <TH w="130px">STATUS</TH>
          <TH w="160px">CLIENT</TH>
          <TH w="160px">PROVIDER</TH>
          <TH w="130px">BLOCK</TH>
          <TH>TX HASH</TH>
        </div>
        {loading ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} style={{ height: 48, borderBottom: `1px solid ${NT.border}` }} />
          ))
        ) : filtered.map((j, i) => {
          const statusColors: Record<string, string> = { OPEN: NT.cyan, FUNDED: NT.green, COMPLETED: NT.text, SUBMITTED: NT.amber, CANCELLED: NT.danger }
          const c = statusColors[j.status] ?? NT.textDim
          return (
            <div key={j.id} style={{ display: "flex", borderBottom: `1px solid ${NT.border}`, position: "relative" }}>
              <span style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 2, background: c, opacity: 0.5 }} />
              <TD w="90px" style={{ fontWeight: 700, color: NT.text }}>#{j.id}</TD>
              <TD w="130px"><StatusPill status={j.status} /></TD>
              <TD w="160px" style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{j.client}</TD>
              <TD w="160px" style={{ fontFamily: "'Space Mono', monospace", fontSize: 11 }}>{j.provider}</TD>
              <TD w="130px" style={{ color: NT.textMuted }}>#{j.block}</TD>
              <TD style={{ color: NT.textMuted, fontSize: 11 }}>{j.tx}</TD>
            </div>
          )
        })}
        <div style={{ padding: "10px 14px", borderTop: `1px solid ${NT.border}`,
          fontSize: 10, letterSpacing: "0.14em", color: NT.textMuted }}>
          SHOWING {filtered.length} / {jobs.length} · LAST 9000 BLOCKS
        </div>
      </Panel>
    </PageShell>
  )
}
