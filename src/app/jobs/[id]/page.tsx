"use client"
import { usePublicClient } from "wagmi"
import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import PageShell from "@/components/PageShell"
import { Panel, StatusPill } from "@/components/atoms"
import { CONTRACTS } from "@/lib/arc"
import { NT } from "@/lib/tokens"
import Link from "next/link"

const JOB_CREATED_TOPIC = "0xb0f0239bfdd96453e24733e18bfc24b70d8fadf123dd977473518dd577ee79b9"
const JOB_COMPLETED_TOPIC = "0x0fd54bd364fa9e67f17b091aefe930932c09fe7651cf5ad02c71a418f3341444"
const JOB_FUNDED_TOPIC = "0xe3fbcc1ea1bdc559ec7f0347efde7655e58b5f45a30b0e4470a583c3ef5496b3"
const JOB_SUBMITTED_TOPIC = "0x80c17db79857f338a6a6df68a6883ecc0ce78e2202fe61ed979733573f40538e"

export default function JobDetailPage() {
  const { id } = useParams()
  const client = usePublicClient()
  const [job, setJob] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!client || !id) return
    async function load() {
      try {
        const latest = await (client as any).getBlockNumber()
        const fromBlock = latest > 9000n ? latest - 9000n : 0n

        const paddedId = "0x" + BigInt(id as string).toString(16).padStart(64, "0")

        const [createdLogs, fundedLogs, submittedLogs, completedLogs] = await Promise.all([
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_CREATED_TOPIC, paddedId], fromBlock, toBlock: latest }),
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_FUNDED_TOPIC, paddedId], fromBlock, toBlock: latest }),
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_SUBMITTED_TOPIC, paddedId], fromBlock, toBlock: latest }),
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_COMPLETED_TOPIC, paddedId], fromBlock, toBlock: latest }),
        ])

        const created = createdLogs[0]
        if (!created) { setLoading(false); return }

        const clientAddr = created.topics[2] ? "0x" + created.topics[2].slice(-40) : "?"
        const providerAddr = created.topics[3] ? "0x" + created.topics[3].slice(-40) : "?"

        const status = completedLogs.length > 0 ? "COMPLETED"
          : submittedLogs.length > 0 ? "SUBMITTED"
          : fundedLogs.length > 0 ? "FUNDED" : "OPEN"

        setJob({
          id: id as string,
          status,
          client: clientAddr,
          provider: providerAddr,
          block: created.blockNumber?.toString() ?? "?",
          createTx: created.transactionHash ?? "?",
          fundTx: fundedLogs[0]?.transactionHash ?? null,
          submitTx: submittedLogs[0]?.transactionHash ?? null,
          completeTx: completedLogs[0]?.transactionHash ?? null,
        })

        const evts = [
          ...createdLogs.map((l: any) => ({ type: "JobCreated", color: NT.cyan, block: l.blockNumber?.toString(), tx: l.transactionHash })),
          ...fundedLogs.map((l: any) => ({ type: "JobFunded", color: NT.green, block: l.blockNumber?.toString(), tx: l.transactionHash })),
          ...submittedLogs.map((l: any) => ({ type: "JobSubmitted", color: NT.amber, block: l.blockNumber?.toString(), tx: l.transactionHash })),
          ...completedLogs.map((l: any) => ({ type: "JobCompleted", color: NT.green, block: l.blockNumber?.toString(), tx: l.transactionHash })),
        ].sort((a, b) => Number(a.block) - Number(b.block))

        setEvents(evts)
      } catch(e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [client, id])

  if (loading) return (
    <PageShell>
      <div style={{ padding: 40, textAlign: "center", color: NT.textMuted, fontSize: 11, letterSpacing: "0.14em" }}>
        LOADING JOB #{id}...
      </div>
    </PageShell>
  )

  if (!job) return (
    <PageShell>
      <div style={{ padding: 40, textAlign: "center", color: NT.danger, fontSize: 11 }}>
        JOB NOT FOUND IN LAST 9000 BLOCKS
      </div>
    </PageShell>
  )

  return (
    <PageShell>
      <div style={{ marginBottom: 16 }}>
        <Link href="/jobs" style={{ color: NT.textMuted, fontSize: 10,
          letterSpacing: "0.14em", textDecoration: "none" }}>← JOBS</Link>
        <div style={{ fontSize: 10, letterSpacing: "0.32em", color: NT.green, marginTop: 8 }}>
          ▸ ./commerce / job / #{id}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
          <h1 style={{ margin: 0, fontFamily: "'Orbitron', monospace",
            fontSize: 28, fontWeight: 800, color: NT.text }}>
            JOB #{job.id}
          </h1>
          <StatusPill status={job.status} />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
        {/* Job Info */}
        <Panel title="Job Details" accent={NT.cyan}>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Job ID", `#${job.id}`],
              ["Status", job.status],
              ["Client", job.client],
              ["Provider", job.provider],
              ["Created Block", `#${job.block}`],
            ].map(([k, v]) => (
              <div key={k} style={{ display: "flex", justifyContent: "space-between",
                gap: 8, borderBottom: `1px solid ${NT.border}`, paddingBottom: 8 }}>
                <span style={{ fontSize: 10, letterSpacing: "0.14em",
                  color: NT.textMuted, flexShrink: 0 }}>{k}</span>
                <span style={{ fontSize: 11, color: NT.text,
                  fontFamily: "'Space Mono', monospace",
                  wordBreak: "break-all", textAlign: "right" }}>{v}</span>
              </div>
            ))}
          </div>
        </Panel>

        {/* TX Hashes */}
        <Panel title="Transactions" accent={NT.green}>
          <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              ["Create TX", job.createTx],
              ["Fund TX", job.fundTx],
              ["Submit TX", job.submitTx],
              ["Complete TX", job.completeTx],
            ].map(([k, v]) => (
              <div key={k} style={{ borderBottom: `1px solid ${NT.border}`, paddingBottom: 8 }}>
                <div style={{ fontSize: 9, letterSpacing: "0.14em",
                  color: NT.textMuted, marginBottom: 4 }}>{k}</div>
                {v ? (
                  <a href={`https://testnet.arcscan.app/tx/${v}`}
                    target="_blank" rel="noreferrer"
                    style={{ fontSize: 10, color: NT.cyan,
                      fontFamily: "'Space Mono', monospace",
                      textDecoration: "none", wordBreak: "break-all" }}>
                    {(v as string).slice(0, 20)}...{(v as string).slice(-8)} ↗
                  </a>
                ) : (
                  <span style={{ color: NT.textMuted, fontSize: 10 }}>—</span>
                )}
              </div>
            ))}
          </div>
        </Panel>
      </div>

      {/* Event Timeline */}
      <Panel title="Event Timeline" accent={NT.amber}>
        {events.length === 0 ? (
          <div style={{ padding: 30, textAlign: "center",
            color: NT.textMuted, fontSize: 11 }}>NO EVENTS FOUND</div>
        ) : events.map((evt, i) => (
          <div key={i} style={{ display: "flex", gap: 14, padding: "12px 16px",
            borderBottom: `1px solid ${NT.border}`, position: "relative" }}>
            <span style={{ position: "absolute", left: 0, top: 0, bottom: 0,
              width: 2, background: evt.color }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10, letterSpacing: "0.14em",
                color: evt.color, fontWeight: 700, marginBottom: 4 }}>
                {evt.type}
              </div>
              <div style={{ fontSize: 10, color: NT.textMuted }}>
                Block #{evt.block}
              </div>
              {evt.tx && (
                <a href={`https://testnet.arcscan.app/tx/${evt.tx}`}
                  target="_blank" rel="noreferrer"
                  style={{ fontSize: 10, color: NT.textMuted,
                    fontFamily: "'Space Mono', monospace", textDecoration: "none" }}>
                  {evt.tx.slice(0, 18)}... ↗
                </a>
              )}
            </div>
          </div>
        ))}
      </Panel>
    </PageShell>
  )
}
