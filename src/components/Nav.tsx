"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { ConnectButton } from "@rainbow-me/rainbowkit"
import { NT } from "@/lib/tokens"
import { ThemeToggle } from "@/components/ThemeToggle"
import { useState, useEffect } from "react"

const NAV_ITEMS = [
  { path: "/",         label: "DASHBOARD" },
  { path: "/agents",   label: "AGENTS" },
  { path: "/jobs",     label: "JOBS" },
  { path: "/create",   label: "CREATE JOB" },
  { path: "/register", label: "REGISTER" },
  { path: "/wallet",   label: "MY WALLET" },
  { path: "/compare",  label: "COMPARE" },
  { path: "/jobboard", label: "JOB BOARD" },
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
    <nav style={{ background: NT.bg, borderBottom: `1px solid ${NT.border}`, position: "sticky", top: 0, zIndex: 100 }}>
      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: `1px solid ${NT.border}88` }}>
        <Link href="/" style={{ textDecoration: "none" }}>
          <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 900, letterSpacing: "0.15em", color: NT.green }}>
            NETURION
          </div>
          <div style={{ fontSize: 8, letterSpacing: "0.2em", color: NT.textMuted }}>AGENT NETWORK // ARC TESTNET</div>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 8, letterSpacing: "0.1em", color: NT.textMuted, display: "flex", alignItems: "center", gap: 4 }}>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: NT.green, animation: "pulse-dot 2s infinite", display: "inline-block" }} />
            {time}
          </div>
          <ThemeToggle />
          <a href="https://faucet.circle.com" target="_blank" rel="noreferrer" style={{
            padding: "6px 10px", fontSize: 9, letterSpacing: "0.12em", fontWeight: 700,
            background: "var(--green-dim)", border: "1px solid var(--green)",
            color: "var(--green)", textDecoration: "none", whiteSpace: "nowrap",
            fontFamily: "'Space Mono', monospace",
          }}>
            FAUCET ↗
          </a>
          <ConnectButton showBalance={false} />
          {/* Hamburger */}
          <button onClick={() => setMenuOpen(!menuOpen)} style={{
            background: "transparent", border: `1px solid ${NT.border}`,
            color: NT.green, cursor: "pointer", padding: "6px 8px",
            display: "flex", flexDirection: "column", gap: 4,
          }}>
            <span style={{ width: 18, height: 2, background: NT.green, display: "block" }} />
            <span style={{ width: 18, height: 2, background: NT.green, display: "block" }} />
            <span style={{ width: 18, height: 2, background: NT.green, display: "block" }} />
          </button>
        </div>
      </div>

      {/* Desktop nav */}
      <div style={{ display: "flex", padding: "0 16px", overflowX: "auto" }}>
        {NAV_ITEMS.map(item => {
          const active = pathname === item.path
          return (
            <Link key={item.path} href={item.path} style={{
              padding: "8px 12px", fontSize: 10, letterSpacing: "0.14em", fontWeight: 700,
              color: active ? NT.green : NT.textMuted,
              borderBottom: active ? `2px solid ${NT.green}` : "2px solid transparent",
              textDecoration: "none", transition: "all 0.2s",
              display: "flex", alignItems: "center", gap: 4, whiteSpace: "nowrap"
            }}>
              {active && <span style={{ color: NT.green }}>▸</span>}
              {item.label}
            </Link>
          )
        })}
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div style={{ background: NT.surface, borderTop: `1px solid ${NT.border}`, padding: 8 }}>
          {NAV_ITEMS.map(item => {
            const active = pathname === item.path
            return (
              <Link key={item.path} href={item.path} onClick={() => setMenuOpen(false)} style={{
                display: "block", padding: "12px 16px", fontSize: 11,
                letterSpacing: "0.14em", fontWeight: 700,
                color: active ? NT.green : NT.textMuted,
                textDecoration: "none",
                borderLeft: active ? `2px solid ${NT.green}` : `2px solid transparent`,
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
