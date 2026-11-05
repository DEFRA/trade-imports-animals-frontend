export const withThousandsSeparators = (value) => {
  const DIGIT_GROUP_SIZE = 3
  const digits = value.toString()
  const groups = []
  for (let end = digits.length; end > 0; end -= DIGIT_GROUP_SIZE) {
    groups.unshift(digits.slice(Math.max(end - DIGIT_GROUP_SIZE, 0), end))
  }
  return groups.join(',')
}
