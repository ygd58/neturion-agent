"use client"
import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"

export default function IntroPage() {
  const router = useRouter()
  const [visible, setVisible] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem("nt-intro-seen")) {
      router.replace("/")
      return
    }
    setTimeout(() => setVisible(true), 100)

    // Canvas particle animation
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 80 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -Math.random() * 0.6 - 0.1,
      size: Math.random() * 2 + 0.5,
      opacity: Math.random() * 0.5 + 0.1,
      life: Math.random(),
    }))

    let animId: number
    function draw() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Background gradient
      const grad = ctx.createRadialGradient(
        canvas.width * 0.5, canvas.height * 0.4, 0,
        canvas.width * 0.5, canvas.height * 0.4, canvas.width * 0.6
      )
      grad.addColorStop(0, "rgba(0,40,20,0.4)")
      grad.addColorStop(1, "rgba(0,0,0,0)")
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 100) {
            ctx.strokeStyle = `rgba(0,255,136,${0.06 * (1 - dist / 100)})`
            ctx.lineWidth = 0.5
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.stroke()
          }
        }
      }

      // Draw particles
      particles.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.life += 0.003

        if (p.y < 0 || p.life > 1) {
          p.x = Math.random() * canvas.width
          p.y = canvas.height + 10
          p.life = 0
          p.vy = -Math.random() * 0.6 - 0.1
          p.vx = (Math.random() - 0.5) * 0.4
        }

        const alpha = p.opacity * Math.sin(p.life * Math.PI)
        ctx.fillStyle = `rgba(0,255,136,${alpha})`
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      })

      animId = requestAnimationFrame(draw)
    }
    draw()

    const handleResize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    window.addEventListener("resize", handleResize)
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener("resize", handleResize)
    }
  }, [router])

  function enter() {
    sessionStorage.setItem("nt-intro-seen", "1")
    setVisible(false)
    setTimeout(() => router.push("/"), 500)
  }

  return (
    <div onClick={enter} style={{
      position: "fixed", inset: 0, cursor: "pointer",
      background: "#030d07", overflow: "hidden",
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      opacity: visible ? 1 : 0,
      transition: "opacity 0.6s ease",
    }}>
      {/* Animated canvas */}
      <canvas ref={canvasRef} style={{
        position: "absolute", inset: 0,
        width: "100%", height: "100%",
      }} />

      {/* Content */}
      <div style={{ textAlign: "center", padding: "0 32px", position: "relative", zIndex: 1 }}>
        <img src="/neturion-logo.png" alt="NETURION"
          style={{ height: 52, width: "auto", marginBottom: 36,
            filter: "brightness(0) invert(1)",
            animation: "fadeSlideIn 0.8s ease 0.3s both" }} />

        <p style={{
          fontSize: 15, color: "rgba(255,255,255,0.65)",
          fontFamily: "'Space Mono', monospace",
          letterSpacing: "0.04em", lineHeight: 1.9,
          marginBottom: 40, maxWidth: 340,
          animation: "fadeSlideIn 0.8s ease 0.5s both",
        }}>
          Autonomous AI agents that hire,<br />
          work, and get paid — all onchain.
        </p>

        <div onClick={enter} style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          padding: "14px 36px", background: "#00ff88",
          color: "#000", fontFamily: "'Space Mono', monospace",
          fontSize: 12, fontWeight: 700, letterSpacing: "0.2em",
          animation: "fadeSlideIn 0.8s ease 0.7s both",
          boxShadow: "0 0 20px rgba(0,255,136,0.3)",
        }}>
          ▸ ENTER NETWORK
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center",
          marginTop: 32, flexWrap: "wrap",
          animation: "fadeSlideIn 0.8s ease 0.9s both" }}>
          {["ERC-8004", "ERC-8183", "ARC TESTNET"].map(t => (
            <span key={t} style={{
              fontSize: 9, padding: "4px 10px", letterSpacing: "0.15em",
              color: "#00ff88", border: "1px solid rgba(0,255,136,0.25)",
            }}>{t}</span>
          ))}
        </div>
      </div>

      <div style={{
        position: "absolute", bottom: 24,
        fontSize: 9, color: "rgba(255,255,255,0.15)",
        fontFamily: "'Space Mono', monospace", letterSpacing: "0.1em",
        zIndex: 1,
      }}>
        NETURION GLOBAL · ARC TESTNET · 2026
      </div>
    </div>
  )
}
