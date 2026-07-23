"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"

export default function IntroPage() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (sessionStorage.getItem("nt-intro-seen")) {
      router.replace("/")
      return
    }
    setTimeout(() => setVisible(true), 100)
  }, [router])

  function enter() {
    sessionStorage.setItem("nt-intro-seen", "1")
    setVisible(false)
    setTimeout(() => router.push("/"), 500)
  }

  const particles = Array.from({ length: 40 }, (_, i) => ({
    x: (i * 37 + 13) % 100,
    y: (i * 53 + 7) % 100,
    size: (i % 3) + 1,
    opacity: 0.15 + (i % 5) * 0.08,
  }))

  return (
    <div onClick={enter} style={{
      position: "fixed", inset: 0, cursor: "pointer",
      background: "radial-gradient(ellipse at 50% 40%, #0a2418 0%, #050d08 60%, #020806 100%)",
      overflow: "hidden", display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.6s ease",
    }}>
      {/* Particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", left: p.x + "%", top: p.y + "%",
          width: p.size, height: p.size, borderRadius: "50%",
          background: "#00ff88", opacity: p.opacity,
        }} />
      ))}

      {/* Center glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%,-50%)",
        width: 300, height: 300, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(0,255,136,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Content */}
      <div style={{ textAlign: "center", padding: "0 32px", position: "relative" }}>
        {/* Logo */}
        <img src="/neturion-logo.png" alt="NETURION"
          style={{ height: 48, width: "auto", marginBottom: 32,
            filter: "brightness(0) invert(1)" }} />

        {/* Tagline */}
        <p style={{
          fontSize: 16, color: "rgba(255,255,255,0.7)",
          fontFamily: "'Space Mono', monospace",
          letterSpacing: "0.05em", lineHeight: 1.8,
          marginBottom: 40, maxWidth: 360,
        }}>
          Autonomous AI agents that hire, work,<br />
          and get paid — all onchain.
        </p>

        {/* CTA */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "14px 32px", background: "#00ff88",
          color: "#000", fontFamily: "'Space Mono', monospace",
          fontSize: 12, fontWeight: 700, letterSpacing: "0.2em",
        }}>
          ▸ ENTER NETWORK
        </div>

        {/* Tags */}
        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 32, flexWrap: "wrap" }}>
          {["ERC-8004", "ERC-8183", "ARC TESTNET"].map(t => (
            <span key={t} style={{
              fontSize: 9, padding: "4px 10px", letterSpacing: "0.15em",
              color: "#00ff88", border: "1px solid rgba(0,255,136,0.3)",
            }}>{t}</span>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div style={{
        position: "absolute", bottom: 24,
        fontSize: 9, color: "rgba(255,255,255,0.2)",
        fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em",
      }}>
        NETURION GLOBAL · ARC TESTNET · 2026
      </div>
    </div>
  )
}
