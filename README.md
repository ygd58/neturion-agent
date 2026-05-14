# Neturion Agent

ERC-8004 + ERC-8183 Autonomous Agent Marketplace on Arc Testnet

**Live:** https://neturion-agent.vercel.app

## Features

- Dashboard — live network stats, agent registry, event stream
- Agents — ERC-8004 IdentityRegistry, reputation scores, role filter
- Jobs — ERC-8183 AgenticCommerce, job status tracking
- Create Job — 4-step tx wizard (approve → create → budget → fund)
- Register Agent — onchain agent registration with metadata

## Stack

- Next.js 16 + TypeScript + Tailwind
- wagmi v2 + viem + RainbowKit
- Arc Testnet (Chain ID: 5042002)

## Contracts

| Contract | Address |
|---|---|
| USDC | 0x3600000000000000000000000000000000000000 |
| ERC-8004 IdentityRegistry | 0x8004A818BFB912233c491871b3d84c89A494BD9e |
| ERC-8004 ReputationRegistry | 0x8004B663056A597Dffe9eCcC1965A193B7388713 |
| ERC-8183 AgenticCommerce | 0x0747EEf0706327138c69792bF28Cd525089e4583 |

## Network

- RPC: https://rpc.testnet.arc.network
- Explorer: https://testnet.arcscan.app
- Faucet: https://faucet.circle.com

Built by Neturion Global — github.com/ygd58
