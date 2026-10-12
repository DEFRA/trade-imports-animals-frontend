export const withReviewedConcurrencyToken = (tokens, journeyId, token) => ({
  ...tokens,
  [journeyId]: token
})

export const withoutReviewedConcurrencyToken = (tokens, journeyId) => {
  const { [journeyId]: _forgotten, ...rest } = tokens
  return rest
}
