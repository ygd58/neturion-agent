"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { ThemeToggle } from "@/components/ThemeToggle"
import { NT } from "@/lib/tokens"
import { useState, useEffect } from "react"

const NAV_MAIN = [
  { path: "/",       label: "DASHBOARD" },
  { path: "/agents", label: "AGENTS" },
  { path: "/jobs",   label: "JOBS" },
  { path: "/escrow", label: "ESCROW" },
]

const NAV_MORE = [
  { path: "/create",      label: "CREATE JOB" },
  { path: "/register",    label: "REGISTER AGENT" },
  { path: "/wallet",      label: "MY WALLET" },
  { path: "/compare",     label: "COMPARE" },
  { path: "/leaderboard", label: "LEADERBOARD" },
  { path: "/jobboard",    label: "JOB BOARD" },
]

export default function Nav() {
  const pathname = usePathname()
  const [time, setTime] = useState("")
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const tick = () => setTime(new Date().toISOString().slice(0, 19).replace("T", " "))
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  return (
    <nav style={{ background: "#030d07", borderBottom: "1px solid #0f2a10",
      position: "sticky", top: 0, zIndex: 100 }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 16px", borderBottom: "1px solid #0a200a" }}>
        <Link href="/intro" onClick={() => sessionStorage.removeItem("nt-intro-seen")}
          style={{ textDecoration: "none" }}>
          <img src="/neturion-logo.png" alt="NETURION"
            style={{ height: 28, width: "auto", filter: "brightness(0) invert(1)" }} />
          <div style={{ fontSize: 8, letterSpacing: "0.2em", color: "var(--text-muted)",
            marginTop: 2 }}>AGENT NETWORK // ARC TESTNET</div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 8, letterSpacing: "0.1em", color: "var(--text-muted)",
            display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "var(--green)",
              animation: "pulse-dot 2s infinite", display: "inline-block" }} />
            {time}
          </div>
          <ThemeToggle />
          <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" style={{
            padding: "5px 8px", fontSize: 9, letterSpacing: "0.1em", fontWeight: 700,
            background: "rgba(0,255,136,0.1)", border: "1px solid var(--green)",
            color: "var(--green)", textDecoration: "none", whiteSpace: "nowrap",
            fontFamily: "'Space Mono', monospace",
          }}>FAUCET ↗</a>
          <ConnectButton showBalance={false} />
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: "transparent", border: "1px solid var(--border)",
            color: "var(--green)", cursor: "pointer", padding: "6px 8px",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <span style={{ width: 18, height: 2, background: "var(--green)", display: "block" }} />
            <span style={{ width: 18, height: 2, background: "var(--green)", display: "block" }} />
            <span style={{ width: 18, height: 2, background: "var(--green)", display: "block" }} />
          </button>
        </div>
      </div>

      {/* Main nav — 4 items */}
      <div style={{ display: "flex", padding: "0 16px", overflowX: "auto" }}>
        {NAV_MAIN.map(item => {
          const active = pathname === item.path
          return (
            <Link key={item.path} href={item.path} style={{
              padding: "8px 14px", fontSize: 10, letterSpacing: "0.14em", fontWeight: 700,
              color: active ? "var(--green)" : "var(--text-muted)",
              borderBottom: active ? "2px solid var(--green)" : "2px solid transparent",
              textDecoration: "none", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap"
            }}>
              {active && <span style={{ color: "var(--green)" }}>▸</span>}
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Hamburger dropdown */}
      {menuOpen && (
        <div style={{ background: "#030d07", borderTop: "1px solid #0a200a", padding: 8 }}>
          {[...NAV_MAIN, ...NAV_MORE].map(item => {
            const active = pathname === item.path
            return (
              <Link key={item.path} href={item.path}
                onClick={() => setMenuOpen(false)} style={{
                  display: "block", padding: "10px 16px", fontSize: 11,
                  letterSpacing: "0.14em", fontWeight: 700,
                  color: active ? "var(--green)" : "var(--text-muted)",
                  textDecoration: "none",
                  borderLeft: active ? "2px solid var(--green)" : "2px solid transparent",
                  marginBottom: 2,
                }}>
                {active && "▸ "}{item.label}
              </Link>
            )
          })}
        </div>
      )}
    </nav>
  )
}
