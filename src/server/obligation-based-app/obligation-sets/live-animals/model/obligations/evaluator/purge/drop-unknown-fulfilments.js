// Step 1: drop fulfilments whose obligation id is not in the current
// manifest ("tolerate-and-amend").
export function dropUnknownFulfilments(fulfilments, obligationsById) {
  const recognisedFulfilments = {}
  for (const [obligationId, fulfilment] of Object.entries(fulfilments)) {
    if (obligationsById.has(obligationId)) {
      recognisedFulfilments[obligationId] = fulfilment
    }
  }
  return recognisedFulfilments
}
