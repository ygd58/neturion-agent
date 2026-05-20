"use client"
import { useEffect } from "react"
import confetti from "canvas-confetti"

export default function Confetti({ trigger }: { trigger: boolean }) {
  useEffect(() => {
    if (!trigger) return

    const colors = ["var(--green)", "var(--cyan)", "var(--amber)"]

    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors,
    })

    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      })
    }, 200)

    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      })
    }, 400)
  }, [trigger])

  return null
}
