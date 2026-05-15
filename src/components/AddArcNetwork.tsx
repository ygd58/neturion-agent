"use client"
import { useEffect } from "react"
import { useAccount } from "wagmi"

const ARC_TESTNET_PARAMS = {
  chainId: "0x4CEFE2",
  chainName: "Arc Testnet",
  nativeCurrency: { name: "USDC", symbol: "USDC", decimals: 18 },
  rpcUrls: ["https://rpc.testnet.arc.network"],
  blockExplorerUrls: ["https://testnet.arcscan.app"],
}

export default function AddArcNetwork() {
  const { isConnected } = useAccount()

  useEffect(() => {
    if (!isConnected) return
    const addNetwork = async () => {
      try {
        await (window as any).ethereum?.request({
          method: "wallet_addEthereumChain",
          params: [ARC_TESTNET_PARAMS],
        })
      } catch {}
    }
    addNetwork()
  }, [isConnected])

  return null
}
