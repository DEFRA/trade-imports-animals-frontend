// Per-session storage for consignors the user created. Every operation takes
// the request so the records live in that user's yar session and never in a
// module-level accumulator shared across every signed-in user.
const CREATED_KEY = 'plantProductsAddressBook'
const SELECTION_KEY = 'plantProductsConsignorSelection'

const isObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value)

export const readCreated = (request) => {
  const stored = request?.yar?.get(CREATED_KEY)
  return Array.isArray(stored) ? stored : []
}

export const writeCreated = (request, records) => {
  request.yar.set(CREATED_KEY, [...records])
}

export const readSelection = (request, journeyId) => {
  const stored = request?.yar?.get(SELECTION_KEY)
  return isObject(stored) ? stored[journeyId] : undefined
}

export const writeSelection = (request, journeyId, id) => {
  const stored = request?.yar?.get(SELECTION_KEY)
  request.yar.set(SELECTION_KEY, {
    ...(isObject(stored) ? stored : {}),
    [journeyId]: id
  })
}
