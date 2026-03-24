import {
  filterVitaminDCatalog,
  type VitaminDProductLike,
} from "./dosingTargets";
import { supplementProducts, SupplementProduct } from "./supplementProducts";

function toVitaminDProductLike(p: SupplementProduct): VitaminDProductLike {
  return {
    id: p.id,
    brand: p.brand,
    productName: p.productName,
    form: p.form,
    price: p.priceUSD,
    unitsPerBottle: p.unitsPerBottle,
    amountPerUnit: p.activeAmountPerUnit,
    activeUnit: p.activeUnit,
    costPerUnitActive: p.costPerActiveUnit,
    servingsPerWeek: p.servingsPerWeek,
  };
}

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
  let products = supplementProducts[supplementKey] ?? [];

  if (supplementKey === "vitamin_d3" && products.length) {
    const mapped = products.map(toVitaminDProductLike);
    const filtered = filterVitaminDCatalog(mapped, "maintenance");
    const allowed = new Set(filtered.map((p) => p.id));
    products = products.filter((p) => allowed.has(p.id));
    if (products.length === 0) {
      products = (supplementProducts[supplementKey] ?? []).filter(
        (p) => p.id !== "vitd_now_50000_50"
      );
    }
  }

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