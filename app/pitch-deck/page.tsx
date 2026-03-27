"use client"

import React, { useEffect } from "react"

const APP_PLAN_BIOMARKERS: { src: string; title: string; line: string }[] = [
  {
    src: "/pitch/ui-plan.png",
    title: "Plan & stack",
    line: "Priority #1, dosing, and your supplement stack.",
  },
  {
    src: "/pitch/ui-biomarkers.png",
    title: "Biomarkers",
    line: "Each marker against an optimal range — and impact on your score.",
  },
]

export default function PitchDeckPage() {
  useEffect(() => {
    document.body.classList.add("pitch-deck-active")
    return () => document.body.classList.remove("pitch-deck-active")
  }, [])

  useEffect(() => {
    const slides = () => document.querySelectorAll<HTMLElement>(".pitch-slide")
    const onKey = (e: KeyboardEvent) => {
      const list = slides()
      if (!list.length) return
      const scrollEl = document.querySelector(".pitch-deck-scroll")
      if (!scrollEl) return
      const h = window.innerHeight
      let i = Math.round(scrollEl.scrollTop / h)
      if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
        e.preventDefault()
        i = Math.min(i + 1, list.length - 1)
        scrollEl.scrollTo({ top: i * h, behavior: "smooth" })
      }
      if (e.key === "ArrowUp" || e.key === "PageUp") {
        e.preventDefault()
        i = Math.max(i - 1, 0)
        scrollEl.scrollTo({ top: i * h, behavior: "smooth" })
      }
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [])

  return (
    <>
      <div className="pitch-deck-scroll" aria-label="Pitch deck slides">
        {/* 1 — Title */}
        <section className="pitch-slide" aria-label="Slide 1">
          <div className="pitch-slide-inner text-center max-w-3xl">
            <p className="pitch-kicker">CYstarters</p>
            <h1 className="pitch-brand text-[clamp(2.5rem,8vw,4.25rem)] leading-[1.05]">Clarion Labs</h1>
            <p className="pitch-sub mt-8 text-[clamp(1.05rem,2.5vw,1.25rem)] max-w-xl mx-auto">
              Bloodwork turned into a clear plan: optimal ranges, prioritized actions, and tracking over time.
            </p>
            <div className="pitch-accent-line" />
            <p className="pitch-sub mt-10 text-[clamp(0.9rem,2vw,1rem)]">Charlie Bennett · founder &amp; coach</p>
          </div>
        </section>

        {/* 2 — Story */}
        <section className="pitch-slide" aria-label="Slide 2">
          <div className="pitch-slide-inner max-w-2xl space-y-7 text-center">
            <p className="pitch-headline text-[clamp(1.45rem,3.6vw,2.1rem)]">
              As a junior in high school, I was one of my state&apos;s top runners.
            </p>
            <p className="pitch-sub text-[clamp(0.95rem,2.1vw,1.08rem)]">
              My season unraveled anyway—not for lack of effort. Low iron, stress fractures: problems I couldn&apos;t
              out-train.
            </p>
            <p className="pitch-sub text-[clamp(0.95rem,2.1vw,1.08rem)]">
              I spent hundreds of dollars on supplements and still couldn&apos;t see clearly what my bloodwork was telling
              me.
            </p>
          </div>
        </section>

        {/* 3 — Setback */}
        <section className="pitch-slide" aria-label="Slide 3">
          <div className="pitch-split pitch-split--reverse">
            <div>
              <p className="pitch-headline text-[clamp(1.65rem,4vw,2.5rem)]">Everything stalled.</p>
              <p className="pitch-sub mt-6 text-[clamp(0.9rem,2vw,1.05rem)] max-w-md">
                Stress fractures, low iron, months on the sideline. My labs looked &quot;normal&quot; on paper. I still
                had no playbook.
              </p>
            </div>
            <div className="pitch-photo">
              <img src="/pitch/photo-struggle.png" alt="" />
            </div>
          </div>
        </section>

        {/* 4 — Comeback */}
        <section className="pitch-slide" aria-label="Slide 4">
          <div className="pitch-split">
            <div className="pitch-photo">
              <img src="/pitch/photo-performance.png" alt="" />
              <div className="pitch-photo-cap">Racing again — school indoor mile record</div>
            </div>
            <div>
              <p className="pitch-headline text-[clamp(1.65rem,4vw,2.5rem)]">About a year later, I was winning again.</p>
              <p className="pitch-sub mt-6 text-[clamp(0.9rem,2vw,1.05rem)] max-w-md">
                I rebuilt with better answers—not luck. Performance still doesn&apos;t live on a reference range alone.
              </p>
            </div>
          </div>
        </section>

        {/* 5 — Coach today */}
        <section className="pitch-slide" aria-label="Slide 5">
          <div className="pitch-split">
            <div className="pitch-photo">
              <img src="/pitch/photo-coaching.png" alt="" />
              <div className="pitch-photo-cap">Coaching athletes I work with today</div>
            </div>
            <div>
              <p className="pitch-headline text-[clamp(1.65rem,4vw,2.5rem)]">I&apos;m a coach now.</p>
              <p className="pitch-sub mt-6 text-[clamp(0.9rem,2vw,1.05rem)] max-w-md">
                I work with hundreds of athletes, including national champions. I keep watching people get razor fit—then
                low iron, low vitamin D, or both—and performances tank. Labs often look fine on paper. I built Clarion to
                turn that bloodwork into a plan you can run.
              </p>
            </div>
          </div>
        </section>

        {/* 6 — Market */}
        <section className="pitch-slide pitch-slide--market" aria-label="Slide 6">
          <div className="pitch-slide-inner max-w-4xl w-full">
            <p className="pitch-kicker text-center mb-8">Why this matters</p>
            <div className="pitch-market-dual">
              <div className="pitch-market-card">
                <p className="pitch-market-num">12%</p>
                <p className="pitch-market-text">
                  of U.S. adults have the health literacy to navigate complex medical decisions with confidence.
                </p>
              </div>
              <div className="pitch-market-card">
                <p className="pitch-market-num pitch-market-num--dollar">
                  $30B<span className="text-[0.42em] relative -top-[0.1em] opacity-90">+</span>
                </p>
                <p className="pitch-market-text">
                  Annual out-of-pocket U.S. spending on complementary health—often without a real plan behind it.
                </p>
              </div>
            </div>
            <p className="pitch-market-bridge">Most people leave the lab with a PDF—and no idea what to do on Monday.</p>
            <p className="pitch-source">
              Sources: HHS (health literacy); NIH NCCIH (complementary health out-of-pocket spending).
            </p>
          </div>
        </section>

        {/* 7 — App: dashboard */}
        <section className="pitch-slide pitch-slide--app pitch-slide--dashboard-solo" aria-label="Slide 7">
          <div className="pitch-dashboard-solo-inner w-full px-4 md:px-8 flex flex-col items-center text-center">
            <p className="pitch-kicker mb-2">The app</p>
            <p className="pitch-sub mb-6 md:mb-8 text-[clamp(0.9rem,1.8vw,1.05rem)] max-w-2xl mx-auto">
              Dashboard — health score, priorities, and what to do today.
            </p>
            <div className="pitch-dashboard-solo-frame">
              <div className="pitch-ui-frame pitch-ui-frame--large pitch-ui-frame--solo">
                <img src="/pitch/ui-dashboard.png" alt="" />
              </div>
            </div>
          </div>
        </section>

        {/* 8 — App (plan + biomarkers) */}
        <section className="pitch-slide pitch-slide--app" aria-label="Slide 8">
          <div className="w-full max-w-[96rem] px-2 md:px-4 mx-auto flex flex-col items-center">
            <p className="pitch-kicker text-center mb-2">The app</p>
            <p className="pitch-sub text-center mb-8 text-[clamp(0.85rem,1.6vw,1rem)] opacity-85 max-w-xl">
              Plan, stack, and every marker
            </p>
            <div className="pitch-product-row pitch-product-row--pair">
              {APP_PLAN_BIOMARKERS.map(({ src, title, line }) => (
                <div key={src} className="pitch-pillar pitch-pillar--large">
                  <p className="pitch-pillar-title">{title}</p>
                  <div className="pitch-ui-frame pitch-ui-frame--large">
                    <img src={src} alt="" />
                  </div>
                  <p className="pitch-pillar-line pitch-pillar-line--large">{line}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 9 — Business */}
        <section className="pitch-slide" aria-label="Slide 9">
          <div className="pitch-revenue-split">
            <div className="w-full max-w-md mx-auto md:mx-0 text-center md:text-left space-y-6 px-2">
              <p className="pitch-kicker">How we make money</p>
              <p className="pitch-sans text-[clamp(1.35rem,3vw,1.85rem)] text-[var(--pitch-text)]">$49 — first analysis</p>
              <p className="pitch-sans text-[clamp(1.35rem,3vw,1.85rem)] text-[var(--pitch-text)]">Clarion+ subscription</p>
              <p className="pitch-sans text-[clamp(1.35rem,3vw,1.85rem)] text-[var(--pitch-text)]">Affiliate revenue</p>
            </div>
            <div className="pitch-pricing-frame">
              <img src="/pitch/ui-pricing.png" alt="" />
            </div>
          </div>
        </section>

        {/* 10 — Ask + close */}
        <section className="pitch-slide" aria-label="Slide 10">
          <div className="pitch-slide-inner text-center max-w-3xl space-y-10 mx-auto">
            <div className="space-y-6">
              <p className="pitch-kicker">What I&apos;m asking for</p>
              <p className="pitch-headline text-[clamp(1.45rem,3.4vw,2.1rem)] max-w-prose mx-auto">
                Help reaching my{" "}
                <strong className="text-[var(--pitch-text)] font-semibold">first hundred customers</strong>, building a
                real <strong className="text-[var(--pitch-text)] font-semibold">marketing</strong> engine, and{" "}
                <strong className="text-[var(--pitch-text)] font-semibold">getting the business off the ground</strong>
                —with go-to-market, positioning, and distribution I don&apos;t have to figure out alone.
              </p>
            </div>
            <div>
              <p className="pitch-brand text-[clamp(2rem,5.5vw,3rem)]">Thank you.</p>
              <div className="pitch-accent-line" />
              <p className="pitch-sub mt-6 text-[clamp(0.95rem,2vw,1.05rem)]">Charlie Bennett · Clarion Labs</p>
            </div>
          </div>
        </section>
      </div>

      <p className="pitch-hint" aria-hidden>
        ~5 min · 10 slides · arrows · print → PDF
      </p>
    </>
  )
}
