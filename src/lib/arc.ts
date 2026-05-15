import { defineChain } from "viem"

export const arcTestnet = defineChain({
  id: 5042002,
  name: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: { default: { http: ["https://rpc.testnet.arc.network"] } },
  blockExplorers: { default: { name: "ArcScan", url: "https://testnet.arcscan.app" } },
})

export const CONTRACTS = {
  USDC: "0x3600000000000000000000000000000000000000",
  IDENTITY_REGISTRY: "0x8004A818BFB912233c491871b3d84c89A494BD9e",
  REPUTATION_REGISTRY: "0x8004B663056A597Dffe9eCcC1965A193B7388713",
  AGENTIC_COMMERCE: "0x0747EEf0706327138c69792bF28Cd525089e4583",
} as const

export const IDENTITY_ABI = [
  { name: "register", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "metadataURI", type: "string" }],
    outputs: [{ name: "tokenId", type: "uint256" }] },
  { name: "ownerOf", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }] },
  { name: "tokenURI", type: "function", stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }] },
  { name: "Transfer", type: "event",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "to", type: "address", indexed: true },
      { name: "tokenId", type: "uint256", indexed: true },
    ] },
] as const

export const REPUTATION_ABI = [
  { name: "getReputation", type: "function", stateMutability: "view",
    inputs: [{ name: "agentId", type: "uint256" }],
    outputs: [
      { name: "totalScore", type: "int256" },
      { name: "count", type: "uint256" },
    ] },
] as const

export const COMMERCE_ABI = [
  { name: "createJob", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "provider", type: "address" },
      { name: "evaluator", type: "address" },
      { name: "expiredAt", type: "uint256" },
      { name: "description", type: "string" },
      { name: "hook", type: "address" },
    ], outputs: [{ name: "jobId", type: "uint256" }] },
  { name: "setBudget", type: "function", stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "amount", type: "uint256" },
      { name: "optParams", type: "bytes" },
    ], outputs: [] },
  { name: "fund", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }, { name: "optParams", type: "bytes" }],
    outputs: [] },
] as const

export const USDC_ABI = [
  { name: "balanceOf", type: "function", stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }] },
  { name: "approve", type: "function", stateMutability: "nonpayable",
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }] },
] as const

export function formatUSDC(units: bigint): string {
  const whole = units / 10n ** 6n
  const frac = (units % 10n ** 6n).toString().padStart(6, "0")
  return whole + "." + frac
}

export function parseUSDC(amount: string): bigint {
  const parts = amount.split(".")
  const whole = parts[0]
  const frac = (parts[1] ?? "").slice(0, 6).padEnd(6, "0")
  return BigInt(whole) * 10n ** 6n + BigInt(frac)
}
