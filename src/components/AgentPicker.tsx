"use client"
import { usePublicClient } from "wagmi"
import { useEffect, useState } from "react"
import { CONTRACTS, IDENTITY_ABI } from "@/lib/arc"
import { NT, ROLES } from "@/lib/tokens"

type Agent = { id: bigint; name: string; role: string; owner: string; capabilities: string[] }

const TRANSFER_EVENT = {
  type: "event" as const, name: "Transfer",
  inputs: [
    { type: "address" as const, name: "from", indexed: true },
    { type: "address" as const, name: "to", indexed: true },
    { type: "uint256" as const, name: "tokenId", indexed: true },
  ],
}

export default function AgentPicker({ onSelect }: { onSelect: (address: string, name: string) => void }) {
  const client = usePublicClient()
  const [agents, setAgents] = useState<Agent[]>([])
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [selected, setSelected] = useState<Agent | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!client || !open || agents.length > 0) return
    setLoading(true)
    async function load() {
      try {
        const latest = await (client as any).getBlockNumber()
        const fromBlock = latest > 9000n ? latest - 9000n : 0n
        const logs = await (client as any).getLogs({
          address: CONTRACTS.IDENTITY_REGISTRY,
          event: TRANSFER_EVENT, fromBlock, toBlock: latest,
        })
        const mints = logs.filter((l: any) => l.args?.from === "0x0000000000000000000000000000000000000000")
        const loaded: Agent[] = []
        for (const log of mints.slice(-30)) {
          const tokenId = log.args?.tokenId as bigint
          if (!tokenId) continue
          try {
            const [owner, uri] = await Promise.all([
              (client as any).readContract({ address: CONTRACTS.IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "ownerOf", args: [tokenId] }),
              (client as any).readContract({ address: CONTRACTS.IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "tokenURI", args: [tokenId] }),
            ])
            let meta: any = {}
            try { meta = JSON.parse(Buffer.from((uri as string).replace("data:application/json;base64,", ""), "base64").toString()) } catch {}
            loaded.push({ id: tokenId, name: meta.name ?? "UNKNOWN", role: meta.role ?? "worker", owner: owner as string, capabilities: meta.capabilities ?? [] })
          } catch {}
        }
        setAgents(loaded.reverse())
      } catch {}
      setLoading(false)
    }
    load()
  }, [client, open])

  const filtered = agents.filter(a =>
    !search ||
    a.name.toLowerCase().includes(search.toLowerCase()) ||
    a.id.toString().includes(search) ||
    a.owner.toLowerCase().includes(search.toLowerCase())
  )

  function pick(agent: Agent) {
    setSelected(agent)
    onSelect(agent.owner, agent.name)
    setOpen(false)
    setSearch("")
  }

  const rc = selected ? (ROLES[selected.role as keyof typeof ROLES] ?? { color: NT.cyan }) : null

  return (
    <div style={{ position: "relative" }}>
      {/* Trigger */}
      <div onClick={() => setOpen(!open)} style={{
        background: NT.surface2, border: `1px solid ${open ? NT.green + "66" : NT.borderHi}`,
        padding: "11px 14px", cursor: "pointer", display: "flex",
        justifyContent: "space-between", alignItems: "center",
      }}>
        {selected ? (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 9, padding: "2px 6px",
              background: rc ? `${rc.color}14` : "transparent",
              color: rc?.color, border: `1px solid ${rc?.color}44`,
              letterSpacing: "0.1em" }}>
              {selected.role.slice(0, 4).toUpperCase()}
            </span>
            <span style={{ color: NT.text, fontSize: 12,
              fontFamily: "'Orbitron', monospace", fontWeight: 700 }}>
              {selected.name}
            </span>
            <span style={{ color: NT.textMuted, fontSize: 10,
              fontFamily: "'Space Mono', monospace" }}>
              #{selected.id.toString()}
            </span>
          </div>
        ) : (
          <span style={{ color: NT.textMuted, fontSize: 11,
            fontFamily: "'Space Mono', monospace", letterSpacing: "0.04em" }}>
            Select from registry or paste address...
          </span>
        )}
        <span style={{ color: NT.green, fontSize: 10 }}>{open ? "▲" : "▼"}</span>
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
          background: NT.surface, border: `1px solid ${NT.border}`,
          borderTop: "none", maxHeight: 280, overflow: "hidden",
          display: "flex", flexDirection: "column",
        }}>
          {/* Search */}
          <div style={{ padding: "8px 12px", borderBottom: `1px solid ${NT.border}`,
            display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: NT.green }}>⌕</span>
            <input autoFocus placeholder="Search agents..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ background: "transparent", border: "none", color: NT.text,
                fontFamily: "'Space Mono', monospace", fontSize: 11,
                outline: "none", flex: 1 }} />
          </div>

          {/* List */}
          <div style={{ overflow: "auto", flex: 1 }}>
            {loading ? (
              <div style={{ padding: 20, textAlign: "center", color: NT.textMuted, fontSize: 10 }}>
                Loading agents...
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ padding: 20, textAlign: "center", color: NT.textMuted, fontSize: 10 }}>
                No agents found
              </div>
            ) : filtered.map(agent => {
              const r = ROLES[agent.role as keyof typeof ROLES] ?? { color: NT.cyan }
              return (
                <div key={agent.id.toString()} onClick={() => pick(agent)}
                  style={{ padding: "10px 14px", borderBottom: `1px solid ${NT.border}`,
                    cursor: "pointer", display: "flex", alignItems: "center",
                    justifyContent: "space-between", gap: 8 }}
                  onMouseEnter={e => (e.currentTarget as any).style.background = `${NT.green}08`}
                  onMouseLeave={e => (e.currentTarget as any).style.background = "transparent"}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 9, padding: "2px 6px",
                      background: `${r.color}14`, color: r.color,
                      border: `1px solid ${r.color}44`, letterSpacing: "0.1em" }}>
                      {agent.role.slice(0,4).toUpperCase()}
                    </span>
                    <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 12,
                      fontWeight: 700, color: NT.text }}>{agent.name}</span>
                    <span style={{ color: NT.textMuted, fontSize: 9 }}>#{agent.id.toString()}</span>
                  </div>
                  <span style={{ color: NT.textMuted, fontSize: 9,
                    fontFamily: "'Space Mono', monospace" }}>
                    {agent.owner.slice(0,8)}...
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
