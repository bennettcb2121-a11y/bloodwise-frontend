import Link from "next/link"
import { notFound } from "next/navigation"
import { createClient } from "@/src/lib/supabase/server"
import { getPaidProtocolBySlug } from "@/src/lib/paidProtocols"
import { ProtocolPaywallButton } from "@/src/components/ProtocolPaywallButton"

type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props) {
  const { slug } = await params
  const protocol = getPaidProtocolBySlug(slug)
  if (!protocol) return { title: "Protocol | Clarion" }
  return { title: `${protocol.title} | Clarion` }
}

export default async function ProtocolPage({ params }: Props) {
  const { slug } = await params
  const protocol = getPaidProtocolBySlug(slug)
  if (!protocol) notFound()

  const supabase = await createClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  let purchased = false
  if (session?.user?.id) {
    const { data } = await supabase
      .from("user_protocol_purchases")
      .select("id")
      .eq("user_id", session.user.id)
      .eq("protocol_slug", slug)
      .maybeSingle()
    purchased = !!data
  }

  return (
    <main className="protocol-shell">
      <div className="protocol-container">
        <header className="protocol-header">
          <Link href="/guides" className="protocol-back">← Guides & protocols</Link>
          <h1 className="protocol-title">{protocol.title}</h1>
          <p className="protocol-desc">{protocol.description}</p>
        </header>
        {purchased ? (
          <article
            className="protocol-body"
            dangerouslySetInnerHTML={{ __html: protocol.body.trim() }}
          />
        ) : (
          <div className="protocol-paywall">
            <p className="protocol-paywall-text">Unlock the full protocol for step-by-step guidance, dosing, and retest timing. You can enter a Stripe promotion code on the checkout page.</p>
            {session?.user ? (
              <ProtocolPaywallButton
                slug={protocol.slug}
                title={protocol.title}
                priceCents={protocol.priceCents}
              />
            ) : (
              <p className="protocol-signin-hint">
                <Link href="/login">Sign in</Link> to purchase and access this protocol.
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
