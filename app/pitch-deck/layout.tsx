import { Playfair_Display, Inter } from "next/font/google"
import "./pitch-deck.css"
import type { Metadata } from "next"

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-pitch-display-raw",
})

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-pitch-sans-raw",
})

export const metadata: Metadata = {
  title: "Clarion Labs — Pitch",
  description: "CYstarters — Charlie Bennett",
}

export default function PitchDeckLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${playfair.variable} ${inter.variable} pitch-deck-root`}>{children}</div>
  )
}
