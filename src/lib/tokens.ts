export const NT = {
  bg:        "var(--bg)",
  surface:   "var(--surface)",
  surface2:  "var(--surface2)",
  surface3:  "var(--surface3)",
  border:    "var(--border)",
  borderHi:  "var(--border-hi)",
  text:      "var(--text)",
  textDim:   "var(--text-dim)",
  textMuted: "var(--text-muted)",
  green:     "var(--green)",
  greenDim:  "var(--green-dim)",
  cyan:      "var(--cyan)",
  cyanDim:   "var(--cyan-dim)",
  amber:     "var(--amber)",
  amberDim:  "var(--amber-dim)",
  danger:    "var(--danger)",
  mono:      "\'Space Mono\', ui-monospace, monospace",
  display:   "\'Orbitron\', \'Space Mono\', monospace",
} as const

export const ROLES = {
  orchestrator: { color: "var(--green)",  dim: "var(--green-dim)", glyph: "◇", short: "ORCH" },
  worker:       { color: "var(--cyan)",   dim: "var(--cyan-dim)",  glyph: "▲", short: "WRKR" },
  evaluator:    { color: "var(--amber)",  dim: "var(--amber-dim)", glyph: "◉", short: "EVAL" },
} as const
