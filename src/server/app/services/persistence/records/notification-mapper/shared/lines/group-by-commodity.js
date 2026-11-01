// The store is line-per-species: a commodity line is one commodity
// code plus ONE species with its own counts and nested identifier records.
// The skeleton commodity blob is one entry per commodity code with a species
// array, per-species counts and complement-level totals — so the mapper
// groups lines by commodity code and consolidates counts up to the total.
export const groupLinesByCommodity = (lines) =>
  Object.values(Object.groupBy(lines, (line) => line.commodityCode))
