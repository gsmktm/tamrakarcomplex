type ProductionDated = {
  release_year?: number | null;
};

/**
 * Newest production year first. The source order is retained for models from
 * the same year, and records without a valid year are placed last.
 */
export function sortByProductionDate<T extends ProductionDated>(items: T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const aYear = Number(a.item.release_year);
      const bYear = Number(b.item.release_year);
      const safeAYear = Number.isFinite(aYear) && aYear > 0 ? aYear : 0;
      const safeBYear = Number.isFinite(bYear) && bYear > 0 ? bYear : 0;
      return safeBYear - safeAYear || a.index - b.index;
    })
    .map(({ item }) => item);
}

