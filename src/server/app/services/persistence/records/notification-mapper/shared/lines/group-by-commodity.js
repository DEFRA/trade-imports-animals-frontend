// The store is line-per-species: a commodity line is one commodity
// code plus ONE species with its own counts and nested identifier records.
// The skeleton commodity blob is one complement per COMMODITY with a species
// array, per-species counts and complement-level totals — so both mappers
// group lines by commodity and consolidate counts UP to the complement total.
export const groupLinesByCommodity = (lines) =>
  Object.values(Object.groupBy(lines, (line) => line.commoditySelection))
