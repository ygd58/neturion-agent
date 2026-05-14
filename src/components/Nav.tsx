"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { NT } from "@/lib/tokens"
import { useState, useEffect } from "react"

const NAV_ITEMS = [
  { path: "/",         label: "DASHBOARD" },
  { path: "/agents",   label: "AGENTS" },
  { path: "/jobs",     label: "JOBS" },
  { path: "/create",   label: "CREATE JOB" },
  { path: "/register", label: "REGISTER AGENT" },
]

export default function Nav() {
  const pathname = usePathname()
  const [time, setTime] = useState("")

  useEffect(() => {
    const tick = () => setTime(new Date().toISOString().slice(0, 19).replace("T", " "))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <nav style={{
      background: NT.bg,
      borderBottom: `1px solid ${NT.border}`,
      position: "sticky", top: 0, zIndex: 100,
    }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 24px", borderBottom: `1px solid ${NT.border}88` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18,
              fontWeight: 900, letterSpacing: "0.15em", color: NT.green }}>
              NETURION
            </div>
            <div style={{ fontSize: 9, letterSpacing: "0.2em",
              color: NT.textMuted }}>AGENT NETWORK // ARC TESTNET</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6,
            fontSize: 9, letterSpacing: "0.14em", color: NT.textMuted }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%",
              background: NT.green, animation: "pulse-dot 2s infinite", display: "inline-block" }} />
            {time} UTC
          </div>
          <ConnectButton />
        </div>
      </div>

      {/* Nav links */}
      <div style={{ display: "flex", padding: "0 24px" }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.path
          return (
            <Link key={item.path} href={item.path} style={{
              padding: "10px 16px",
              fontSize: 10, letterSpacing: "0.18em", fontWeight: 700,
              color: active ? NT.green : NT.textMuted,
              borderBottom: active ? `2px solid ${NT.green}` : "2px solid transparent",
              textDecoration: "none", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 6
            }}>
              {active && <span style={{ color: NT.green }}>▸</span>}
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
