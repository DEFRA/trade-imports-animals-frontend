// Skeleton parity: getTotal (lodash) maps Number, drops NaN and sums — a blank
// count contributes 0. Omitted entirely when no line carries the field.
export const totalOf = (lines, field) => {
  const values = lines
    .map((line) => line[field])
    .filter((value) => value !== undefined)
  if (values.length === 0) {
    return undefined
  }
  return values
    .map(Number)
    .filter((number) => !Number.isNaN(number))
    .reduce((sum, number) => sum + number, 0)
}
