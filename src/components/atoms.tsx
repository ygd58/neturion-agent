import { NT, ROLES } from "@/lib/tokens"

export function Panel({ 
  children, title, accent, action, style 
}: { 
  children: React.ReactNode
  title?: string
  accent?: string
  action?: React.ReactNode
  style?: React.CSSProperties
}) {
  const c = accent ?? NT.green
  return (
    <div style={{
      border: `1px solid ${NT.border}`,
      background: NT.surface,
      position: "relative",
      ...style
    }}>
      {title && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 14px", borderBottom: `1px solid ${NT.border}`,
          background: NT.surface2
        }}>
          <span style={{ fontSize: 10, letterSpacing: "0.2em", color: c,
            fontWeight: 700, textTransform: "uppercase" as const }}>
            ▸ {title}
          </span>
          {action && <span>{action}</span>}
        </div>
      )}
      {children}
    </div>
  )
}

export function RoleChip({ role, size = 11 }: { role: string, size?: number }) {
  const r = ROLES[role as keyof typeof ROLES] ?? { color: NT.cyan, glyph: "●", short: role.toUpperCase().slice(0,4) }
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 7px", fontSize: size, fontWeight: 700,
      letterSpacing: "0.08em", textTransform: "uppercase" as const,
      color: r.color, background: `${r.color}14`, border: `1px solid ${r.color}55`
    }}>
      {r.glyph} {r.short}
    </span>
  )
}

export function StatusPill({ status }: { status: string }) {
  const colorMap: Record<string, string> = {
    OPEN: NT.cyan, FUNDED: NT.green, SUBMITTED: NT.amber,
    COMPLETED: NT.text, CANCELLED: NT.danger, LIVE: NT.green, PENDING: NT.amber
  }
  const c = colorMap[status] ?? NT.textDim
  return (
    <span style={{
      padding: "3px 8px", fontSize: 9.5, letterSpacing: "0.14em",
      fontWeight: 700, color: c, background: `${c}14`,
      border: `1px solid ${c}55`
    }}>
      {status}
    </span>
  )
}

export function Stat({ label, value, unit, delta, accent }: {
  label: string, value: string | number, unit?: string, delta?: string, accent?: string
}) {
  const c = accent ?? NT.green
  return (
    <div style={{
      padding: "14px 16px", border: `1px solid ${NT.border}`,
      background: NT.surface, position: "relative"
    }}>
      <div style={{ fontSize: 9, letterSpacing: "0.2em", color: NT.textMuted,
        textTransform: "uppercase" as const, marginBottom: 8 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
        <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 22,
          fontWeight: 700, color: c, letterSpacing: "0.04em" }}>{value}</span>
        {unit && <span style={{ fontSize: 11, color: NT.textMuted }}>{unit}</span>}
      </div>
      {delta && (
        <div style={{ fontSize: 9.5, color: NT.textMuted, marginTop: 4,
          letterSpacing: "0.1em" }}>{delta}</div>
      )}
    </div>
  )
}

export function Addr({ value, color }: { value: string, color?: string }) {
  return (
    <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 11,
      color: color ?? NT.textDim, letterSpacing: "0.04em" }}>
      {value}
    </span>
  )
}

export function TH({ children, w, align }: { children?: React.ReactNode, w?: string, align?: string }) {
  return (
    <div style={{
      width: w, flex: w ? undefined : 1,
      padding: "10px 12px", fontSize: 9, letterSpacing: "0.2em",
      color: NT.textMuted, fontWeight: 700, textTransform: "uppercase" as const,
      textAlign: (align as any) ?? "left"
    }}>
      {children}
    </div>
  )
}

export function TD({ children, w, align, style }: {
  children?: React.ReactNode, w?: string, align?: string, style?: React.CSSProperties
}) {
  return (
    <div style={{
      width: w, flex: w ? undefined : 1,
      padding: "12px 12px", fontSize: 12,
      color: NT.textDim, display: "flex", alignItems: "center",
      textAlign: (align as any) ?? "left",
      ...style
    }}>
      {children}
    </div>
  )
}
