"use client"
import { NT } from "@/lib/tokens"

export default function NetworkMesh() {
  const W = 1320, H = 840
  let s = 7
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280 }
  const N = 110
  const pts: [number, number, number][] = Array.from({ length: N }, () => [rand() * W, rand() * H, 0.6 + rand() * 1.6])
  const links: [number, number, number][] = []
  for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
    const dx = pts[i][0] - pts[j][0], dy = pts[i][1] - pts[j][1]
    const d = Math.hypot(dx, dy)
    if (d < 110) links.push([i, j, 1 - d / 110])
  }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice"
      style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh",
        opacity: 0.25, pointerEvents: "none", zIndex: 0, mixBlendMode: "screen" }}>
      <defs>
        <radialGradient id="meshGlow" cx="70%" cy="40%" r="70%">
          <stop offset="0%" stopColor={NT.cyan} stopOpacity="0.18" />
          <stop offset="100%" stopColor={NT.cyan} stopOpacity="0" />
        </radialGradient>
      </defs>
      <rect width={W} height={H} fill="url(#meshGlow)" />
      {links.map(([i, j, a], k) => (
        <line key={k} x1={pts[i][0]} y1={pts[i][1]} x2={pts[j][0]} y2={pts[j][1]}
          stroke={NT.cyan} strokeWidth="0.4" opacity={a * 0.3} />
      ))}
      {pts.map(([x, y, r], i) => (
        <circle key={i} cx={x} cy={y} r={r} fill={NT.cyan} opacity={0.4} />
      ))}
    </svg>
  )
}
