import { supplementProducts, SupplementProduct } from "./supplementProducts";

export type SupplementLeaderboardEntry = SupplementProduct & {
  rankByValue: number;
  rankByPotency: number;
};

export type SupplementLeaderboard = {
  supplementKey: string;
  bestValue?: SupplementLeaderboardEntry;
  highestPotency?: SupplementLeaderboardEntry;
  rankedByValue: SupplementLeaderboardEntry[];
  rankedByPotency: SupplementLeaderboardEntry[];
};

function sameUnit(products: SupplementProduct[]) {
  return products.every((p) => p.activeUnit === products[0]?.activeUnit);
}

export function buildSupplementLeaderboard(
  supplementKey: string
): SupplementLeaderboard {
  const products = supplementProducts[supplementKey] ?? [];

  if (!products.length) {
    return {
      supplementKey,
      rankedByValue: [],
      rankedByPotency: []
    };
  }

  const rankedByValueBase = [...products].sort(
    (a, b) => a.costPerActiveUnit - b.costPerActiveUnit
  );

  const rankedByPotencyBase = [...products].sort(
    (a, b) => b.activeAmountPerUnit - a.activeAmountPerUnit
  );

  const rankedByValue: SupplementLeaderboardEntry[] = rankedByValueBase.map(
    (product, index) => ({
      ...product,
      rankByValue: index + 1,
      rankByPotency:
        rankedByPotencyBase.findIndex((p) => p.id === product.id) + 1
    })
  );

  const rankedByPotency: SupplementLeaderboardEntry[] = rankedByPotencyBase.map(
    (product, index) => ({
      ...product,
      rankByPotency: index + 1,
      rankByValue:
        rankedByValueBase.findIndex((p) => p.id === product.id) + 1
    })
  );

  return {
    supplementKey,
    bestValue: rankedByValue[0],
    highestPotency: rankedByPotency[0],
    rankedByValue,
    rankedByPotency
  };
}

export function buildLeaderboardsForSupplements(supplementKeys: string[]) {
  return supplementKeys.reduce<Record<string, SupplementLeaderboard>>(
    (acc, key) => {
      acc[key] = buildSupplementLeaderboard(key);
      return acc;
    },
    {}
  );
}

export function getMonthlyCostEstimate(
  product: SupplementProduct,
  targetAmountPerDay: number
): number | null {
  if (!targetAmountPerDay || targetAmountPerDay <= 0) return null;

  const unitsPerDay = targetAmountPerDay / product.activeAmountPerUnit;
  const daysPerBottle = product.unitsPerBottle / unitsPerDay;

  if (!isFinite(daysPerBottle) || daysPerBottle <= 0) return null;

  return (30 / daysPerBottle) * product.priceUSD;
}