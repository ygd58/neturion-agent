"use client"
import { createContext, useContext, useState, useEffect } from "react"

type Theme = "dark" | "light"
const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({ theme: "dark", toggle: () => {} })

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    const saved = localStorage.getItem("nt-theme") as Theme
    if (saved) setTheme(saved)
  }, [])

  function toggle() {
    const next = theme === "dark" ? "light" : "dark"
    setTheme(next)
    localStorage.setItem("nt-theme", next)
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      <div data-theme={theme} style={{ minHeight: "100vh" }}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}

export function useTheme() { return useContext(ThemeContext) }

export function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button onClick={toggle} style={{
      background: "transparent", border: "1px solid #1a2638",
      color: theme === "dark" ? "#00ff88" : "#333",
      cursor: "pointer", padding: "6px 10px",
      fontFamily: "'Space Mono', monospace",
      fontSize: 12, letterSpacing: "0.1em",
      transition: "all 0.2s",
    }} title="Toggle theme">
      {theme === "dark" ? "☀" : "◑"}
    </button>
  )
}
