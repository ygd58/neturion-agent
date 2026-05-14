"use client"

import { usePublicClient } from "wagmi"
import { useEffect, useState } from "react"
import { CONTRACTS, IDENTITY_ABI, REPUTATION_ABI } from "@/lib/arc"

type Agent = {
  id: bigint
  owner: string
  name: string
  role: string
  capabilities: string[]
  repScore: number
  repCount: number
}

const TRANSFER_EVENT = {
  type: "event" as const,
  name: "Transfer",
  inputs: [
    { type: "address" as const, name: "from", indexed: true },
    { type: "address" as const, name: "to", indexed: true },
    { type: "uint256" as const, name: "tokenId", indexed: true },
  ],
}

const roleColors: Record<string, string> = {
  orchestrator: "bg-purple-900 text-purple-300",
  worker: "bg-cyan-900 text-cyan-300",
  evaluator: "bg-yellow-900 text-yellow-300",
}

export default function AgentList() {
  const client = usePublicClient()
  const [agents, setAgents] = useState<Agent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!client) return
    async function load() {
      try {
        const latest = await client!.getBlockNumber()
        const fromBlock = latest > 9000n ? latest - 9000n : 0n
        const logs = await client!.getLogs({ address: CONTRACTS.IDENTITY_REGISTRY, event: TRANSFER_EVENT, fromBlock, toBlock: latest })
        const mintLogs = logs.filter(l => (l.args as any).from === "0x0000000000000000000000000000000000000000")
        const loaded: Agent[] = []

        for (const log of mintLogs.slice(-20)) {
          const tokenId = (log.args as any).tokenId as bigint
          if (!tokenId) continue
          try {
            const [owner, uri] = await Promise.all([
              client!.readContract({ address: CONTRACTS.IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "ownerOf", args: [tokenId] }) as Promise<string>,
              client!.readContract({ address: CONTRACTS.IDENTITY_REGISTRY, abi: IDENTITY_ABI, functionName: "tokenURI", args: [tokenId] }) as Promise<string>,
            ])
            let meta: any = {}
            try { meta = JSON.parse(Buffer.from(uri.replace("data:application/json;base64,", ""), "base64").toString()) } catch {}
            let repScore = 0, repCount = 0
            try {
              const rep = await client!.readContract({ address: CONTRACTS.REPUTATION_REGISTRY, abi: REPUTATION_ABI, functionName: "getReputation", args: [tokenId] }) as [bigint, bigint]
              repScore = Number(rep[0]); repCount = Number(rep[1])
            } catch {}
            loaded.push({ id: tokenId, owner, name: meta.name ?? "Unknown", role: meta.role ?? "unknown", capabilities: meta.capabilities ?? [], repScore, repCount })
          } catch {}
        }
        setAgents(loaded.reverse())
      } catch {}
      setLoading(false)
    }
    load()
  }, [client])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-white">Registered Agents</h2>
        <span className="text-xs text-gray-500">Last 9000 blocks</span>
      </div>
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl p-4 animate-pulse h-20" />)}
        </div>
      ) : agents.length === 0 ? (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-8 text-center text-gray-500">No agents found</div>
      ) : (
        <div className="space-y-3">
          {agents.map((agent) => (
            <div key={agent.id.toString()} className="bg-gray-900 border border-gray-800 rounded-xl p-4 hover:border-gray-600 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-cyan-400 font-mono text-sm">#{agent.id.toString()}</span>
                    <span className={"text-xs px-2 py-0.5 rounded-full " + (roleColors[agent.role] ?? "bg-gray-800 text-gray-400")}>{agent.role}</span>
                    <span className="font-medium text-white">{agent.name}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {agent.capabilities.map(cap => <span key={cap} className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded">{cap}</span>)}
                  </div>
                  <p className="text-xs text-gray-600 mt-1 font-mono">{agent.owner.slice(0,10)}...{agent.owner.slice(-6)}</p>
                </div>
                <div className="text-right ml-4">
                  {agent.repCount > 0 ? (
                    <>
                      <p className={"font-bold " + (agent.repScore / agent.repCount >= 80 ? "text-green-400" : "text-yellow-400")}>
                        {(agent.repScore / agent.repCount).toFixed(1)}
                      </p>
                      <p className="text-xs text-gray-500">{agent.repCount} reviews</p>
                    </>
                  ) : <p className="text-xs text-gray-600">No rep</p>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
