"use client"
import { usePublicClient, useAccount } from "wagmi"
import { useEffect, useState } from "react"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import PageShell from "@/components/PageShell"
import { Panel, StatusPill } from "@/components/atoms"
import { CONTRACTS, IDENTITY_ABI, REPUTATION_ABI, USDC_ABI } from "@/lib/arc"
import { NT, ROLES } from "@/lib/tokens"
import Link from "next/link"

const JOB_CREATED_TOPIC = "0xb0f0239bfdd96453e24733e18bfc24b70d8fadf123dd977473518dd577ee79b9"
const JOB_COMPLETED_TOPIC = "0x0fd54bd364fa9e67f17b091aefe930932c09fe7651cf5ad02c71a418f3341444"
const TRANSFER_EVENT = {
  type: "event" as const, name: "Transfer",
  inputs: [
    { type: "address" as const, name: "from", indexed: true },
    { type: "address" as const, name: "to", indexed: true },
    { type: "uint256" as const, name: "tokenId", indexed: true },
  ],
}

export default function WalletPage() {
  const { address, isConnected } = useAccount()
  const client = usePublicClient()
  const [balance, setBalance] = useState("0")
  const [agents, setAgents] = useState<any[]>([])
  const [jobs, setJobs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!client || !address) return
    async function load() {
      try {
        // USDC balance
        const bal = await (client as any).readContract({
          address: CONTRACTS.USDC, abi: USDC_ABI,
          functionName: "balanceOf", args: [address],
        }) as bigint
        const whole = bal / 10n ** 6n
        const frac = (bal % 10n ** 6n).toString().padStart(6, "0")
        setBalance(whole + "." + frac.slice(0, 2))

        const latest = await (client as any).getBlockNumber()
        const fromBlock = latest > 9000n ? latest - 9000n : 0n

        // My agents
        const logs = await (client as any).getLogs({
          address: CONTRACTS.IDENTITY_REGISTRY,
          event: TRANSFER_EVENT, fromBlock, toBlock: latest,
        })
        const mine = logs.filter((l: any) =>
          l.args?.to?.toLowerCase() === address.toLowerCase() &&
          l.args?.from === "0x0000000000000000000000000000000000000000"
        )

        const loadedAgents = []
        for (const log of mine) {
          const tokenId = log.args?.tokenId as bigint
          if (!tokenId) continue
          try {
            const uri = await (client as any).readContract({
              address: CONTRACTS.IDENTITY_REGISTRY, abi: IDENTITY_ABI,
              functionName: "tokenURI", args: [tokenId],
            })
            let meta: any = {}
            try { meta = JSON.parse(Buffer.from((uri as string).replace("data:application/json;base64,", ""), "base64").toString()) } catch {}
            let repScore = 0, repCount = 0
            try {
              const rep = await (client as any).readContract({
                address: CONTRACTS.REPUTATION_REGISTRY, abi: REPUTATION_ABI,
                functionName: "getReputation", args: [tokenId],
              }) as [bigint, bigint]
              repScore = Number(rep[0]); repCount = Number(rep[1])
            } catch {}
            loadedAgents.push({ id: tokenId, name: meta.name ?? "UNKNOWN", role: meta.role ?? "worker", capabilities: meta.capabilities ?? [], repScore, repCount })
          } catch {}
        }
        setAgents(loadedAgents)

        // My jobs
        const paddedAddr = address.toLowerCase().replace("0x", "0x000000000000000000000000")
        const [asClient, asProvider, completedLogs] = await Promise.all([
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_CREATED_TOPIC, null, paddedAddr], fromBlock, toBlock: latest }),
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_CREATED_TOPIC, null, null, paddedAddr], fromBlock, toBlock: latest }),
          (client as any).getLogs({ address: CONTRACTS.AGENTIC_COMMERCE, topics: [JOB_COMPLETED_TOPIC], fromBlock, toBlock: latest }),
        ])

        const completedIds = new Set(completedLogs.map((l: any) => l.topics[1]))
        const allJobs = [
          ...asClient.map((l: any) => ({ id: l.topics[1] ? BigInt(l.topics[1]).toString() : "?", role: "client", status: completedIds.has(l.topics[1]) ? "COMPLETED" : "OPEN", block: l.blockNumber?.toString() ?? "?" })),
          ...asProvider.map((l: any) => ({ id: l.topics[1] ? BigInt(l.topics[1]).toString() : "?", role: "provider", status: completedIds.has(l.topics[1]) ? "COMPLETED" : "OPEN", block: l.blockNumber?.toString() ?? "?" })),
        ]
        setJobs(allJobs)
      } catch(e) { console.error(e) }
      setLoading(false)
    }
    load()
  }, [client, address])

  if (!isConnected) return (
    <PageShell>
      <div style={{ padding: 60, textAlign: "center" }}>
        <p style={{ color: "var(--text-muted)", fontSize: 11, letterSpacing: "0.14em", marginBottom: 20 }}>
          CONNECT WALLET TO VIEW DASHBOARD
        </p>
        <ConnectButton />
      </div>
    </PageShell>
  )

  const completedJobs = jobs.filter(j => j.status === "COMPLETED")
  const successRate = jobs.length > 0 ? ((completedJobs.length / jobs.length) * 100).toFixed(0) + "%" : "N/A"
  const totalRep = agents.reduce((sum, a) => sum + (a.repCount > 0 ? a.repScore / a.repCount : 0), 0)
  const avgRep = agents.length > 0 ? (totalRep / agents.length).toFixed(1) : "N/A"

  return (
    <PageShell>
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 10, letterSpacing: "0.32em", color: "var(--green)" }}>▸ ./wallet / dashboard</div>
        <h1 style={{ margin: "6px 0 4px", fontFamily: "'Orbitron', monospace", fontSize: 24,
          fontWeight: 800, color: "var(--text)", textTransform: "uppercase" }}>
          My <span style={{ color: "var(--green)" }}>Dashboard</span>
        </h1>
        <div style={{ fontSize: 10, color: "var(--text-muted)", fontFamily: "'Space Mono', monospace",
          wordBreak: "break-all" }}>
          {address}
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8, marginBottom: 16 }}>
        {[
          { label: "USDC BALANCE", value: balance, unit: "USDC", color: "var(--green)" },
          { label: "MY AGENTS", value: agents.length.toString(), color: "var(--cyan)" },
          { label: "TOTAL JOBS", value: jobs.length.toString(), color: "var(--cyan)" },
          { label: "SUCCESS RATE", value: successRate, color: "var(--green)" },
        ].map(s => (
          <div key={s.label} style={{ padding: "12px 14px",
            border: "1px solid var(--border)", background: "var(--surface)" }}>
            <div style={{ fontSize: 9, letterSpacing: "0.18em",
              color: "var(--text-muted)", marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18,
              fontWeight: 700, color: s.color }}>
              {loading ? "..." : s.value}
              {s.unit && <span style={{ fontSize: 10, color: "var(--text-muted)",
                marginLeft: 4 }}>{s.unit}</span>}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {/* My Agents */}
        <Panel title={"My Agents · " + agents.length} accent="var(--green)"
          action={<Link href="/register" style={{ fontSize: 9, color: "var(--green)",
            textDecoration: "none", border: "1px solid var(--green)", padding: "2px 8px",
            letterSpacing: "0.1em" }}>+ NEW</Link>}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 60, borderBottom: "1px solid var(--border)" }} />
            ))
          ) : agents.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 12 }}>
                No agents registered yet
              </p>
              <Link href="/register" style={{
                padding: "8px 14px", background: "var(--green-dim)",
                border: "1px solid var(--green)", color: "var(--green)",
                textDecoration: "none", fontSize: 10, letterSpacing: "0.12em",
              }}>▸ REGISTER AGENT</Link>
            </div>
          ) : agents.map((agent, i) => {
            const rc = ROLES[agent.role as keyof typeof ROLES] ?? { color: "var(--cyan)", glyph: "●" }
            const avg = agent.repCount > 0 ? agent.repScore / agent.repCount : 0
            return (
              <Link key={agent.id.toString()} href={"/agents/" + agent.id.toString()}
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "12px 14px", borderBottom: "1px solid var(--border)",
                  textDecoration: "none", gap: 8 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                    <span style={{ fontSize: 9, padding: "1px 5px",
                      background: rc.color + "14", color: rc.color,
                      border: "1px solid " + rc.color + "44" }}>
                      {agent.role.slice(0,4).toUpperCase()}
                    </span>
                    <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 12,
                      fontWeight: 700, color: "var(--text)" }}>{agent.name}</span>
                  </div>
                  <span style={{ fontSize: 9, color: "var(--text-muted)" }}>
                    #{agent.id.toString()}
                  </span>
                </div>
                {agent.repCount > 0 && (
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 16,
                    fontWeight: 700, color: avg >= 80 ? "var(--green)" : "var(--amber)" }}>
                    {avg.toFixed(0)}
                  </div>
                )}
              </Link>
            )
          })}
        </Panel>

        {/* My Jobs */}
        <Panel title={"My Jobs · " + jobs.length} accent="var(--cyan)"
          action={<Link href="/create" style={{ fontSize: 9, color: "var(--cyan)",
            textDecoration: "none", border: "1px solid var(--cyan)", padding: "2px 8px",
            letterSpacing: "0.1em" }}>+ NEW</Link>}>
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} style={{ height: 48, borderBottom: "1px solid var(--border)" }} />
            ))
          ) : jobs.length === 0 ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <p style={{ color: "var(--text-muted)", fontSize: 11, marginBottom: 12 }}>
                No jobs found
              </p>
              <Link href="/create" style={{
                padding: "8px 14px", background: "var(--cyan-dim)",
                border: "1px solid var(--cyan)", color: "var(--cyan)",
                textDecoration: "none", fontSize: 10, letterSpacing: "0.12em",
              }}>▸ CREATE JOB</Link>
            </div>
          ) : jobs.slice(0, 8).map((job, i) => (
            <Link key={i} href={"/jobs/" + job.id}
              style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 14px", borderBottom: "1px solid var(--border)",
                textDecoration: "none" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, color: "var(--text)", fontSize: 12 }}>
                  #{job.id}
                </span>
                <span style={{ fontSize: 9, padding: "1px 5px",
                  background: job.role === "client" ? "var(--green-dim)" : "var(--cyan-dim)",
                  color: job.role === "client" ? "var(--green)" : "var(--cyan)",
                  border: "1px solid " + (job.role === "client" ? "var(--green)" : "var(--cyan)") + "44" }}>
                  {job.role.toUpperCase()}
                </span>
              </div>
              <StatusPill status={job.status} />
            </Link>
          ))}
          {jobs.length > 8 && (
            <div style={{ padding: "8px 14px", fontSize: 10,
              color: "var(--text-muted)", letterSpacing: "0.1em", textAlign: "center" }}>
              +{jobs.length - 8} more jobs
            </div>
          )}
        </Panel>
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
        <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" style={{
          padding: "8px 16px", background: "transparent",
          border: "1px solid var(--border)", color: "var(--text-muted)",
          fontFamily: "'Space Mono', monospace", fontSize: 10,
          letterSpacing: "0.14em", textDecoration: "none",
        }}>GET TESTNET USDC ↗</a>
      </div>
    </PageShell>
  )
}
