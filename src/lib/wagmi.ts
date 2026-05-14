import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { arcTestnet } from "./arc"

export const config = getDefaultConfig({
  appName: "Arc Agent Marketplace",
  projectId: "arc-marketplace",
  chains: [arcTestnet],
  ssr: true,
})
