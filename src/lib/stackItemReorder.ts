import type { SavedSupplementStackItem } from "@/src/lib/bloodwiseDb"
import type { AffiliateProduct } from "@/src/lib/affiliateProducts"
import { applyAmazonAssociatesTag } from "@/src/lib/affiliateProducts"
import { getAffiliateProductForStackItem, getAmazonSearchUrl } from "@/src/lib/stackAffiliate"

export type StackReorderContext = {
  /** Primary commerce / link CTA */
  primaryUrl: string
  primaryLabel: string
  /** Optional Clarion affiliate alternative when user saved their own link */
  secondaryUrl: string | null
  secondaryLabel: string | null
  /** Thumbnail: Clarion catalog image when available */
  imageUrl: string | null
  /** True when primary opens the user’s saved product URL */
  isUserLink: boolean
}

function affiliateOrNull(item: SavedSupplementStackItem): AffiliateProduct | null {
  return getAffiliateProductForStackItem(item)
}

/**
 * Prefer the user’s saved product link for the main button; Clarion’s pick as secondary when both exist.
 */
export function getStackItemReorderContext(item: SavedSupplementStackItem): StackReorderContext {
  const affiliate = affiliateOrNull(item)
  const userUrl = item.productUrl?.trim()
  const validUser = Boolean(userUrl && /^https?:\/\//i.test(userUrl))

  if (validUser && userUrl) {
    return {
      primaryUrl: applyAmazonAssociatesTag(userUrl),
      primaryLabel: "View your product",
      secondaryUrl: affiliate?.affiliateUrl ? applyAmazonAssociatesTag(affiliate.affiliateUrl) : null,
      secondaryLabel: affiliate ? "See Clarion’s pick" : null,
      imageUrl: affiliate?.imageUrl ?? null,
      isUserLink: true,
    }
  }

  const fallback = affiliate?.affiliateUrl
    ? applyAmazonAssociatesTag(affiliate.affiliateUrl)
    : getAmazonSearchUrl(item.supplementName)
  return {
    primaryUrl: fallback,
    primaryLabel: affiliate ? "Reorder on Amazon" : "View on Amazon",
    secondaryUrl: null,
    secondaryLabel: null,
    imageUrl: affiliate?.imageUrl ?? null,
    isUserLink: false,
  }
}
