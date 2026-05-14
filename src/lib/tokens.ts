export const NT = {
  bg:        '#050810',
  surface:   '#0a1018',
  surface2:  '#0d1422',
  surface3:  '#111a2d',
  border:    '#1a2638',
  borderHi:  '#2a3a52',
  text:      '#e6edf7',
  textDim:   '#8593ad',
  textMuted: '#525d75',
  green:     '#00ff88',
  greenDim:  '#0a6b3f',
  cyan:      '#00d4ff',
  cyanDim:   '#0a5d7a',
  amber:     '#ffb547',
  amberDim:  '#6b4818',
  danger:    '#ff3b6b',
  mono:      "'Space Mono', ui-monospace, monospace",
  display:   "'Orbitron', 'Space Mono', monospace",
} as const

export const ROLES = {
  orchestrator: { color: NT.green,  dim: NT.greenDim, glyph: '◇', short: 'ORCH' },
  worker:       { color: NT.cyan,   dim: NT.cyanDim,  glyph: '▲', short: 'WRKR' },
  evaluator:    { color: NT.amber,  dim: NT.amberDim, glyph: '◉', short: 'EVAL' },
} as const
