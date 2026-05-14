import Nav from "@/components/Nav"
import { NT } from "@/lib/tokens"

export default function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", background: NT.bg, position: "relative", zIndex: 1 }}>
      <Nav />
      <main style={{ maxWidth: 1320, margin: "0 auto", padding: "24px" }}>
        {children}
      </main>
    </div>
  )
}
