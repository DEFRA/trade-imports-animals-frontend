import { assembleFulfilments } from '../../src/server/app/bridge/assemble-fulfilments.js'
import * as countries from '../../src/server/app/services/countries/index.js'

const STALE_CODE = 'ZZ'

// A scenario whose sentinel has become resolvable no longer simulates the
// failure it claims to. Fail loud.
const assertBogus = async () => {
  const list = await countries.originCountries()
  if (list.some((c) => c.value === STALE_CODE)) {
    throw new Error(
      `STALE_CODE '${STALE_CODE}' is now in the catalogue — pick a different sentinel.`
    )
  }
}

export const countryStale = {
  id: 'country-stale',
  summary:
    'Rewrite the stored countryOfOrigin to a code the current catalogue no longer offers',
  mutate: async (notifications, referenceNumber) => {
    await assertBogus()
    const contributions = assembleFulfilments({ countryOfOrigin: STALE_CODE })
    for (const [obligationId, value] of Object.entries(contributions)) {
      const { matchedCount } = await notifications.updateOne(
        { referenceNumber, 'fulfilments.obligationId': obligationId },
        { $set: { 'fulfilments.$.value': value } }
      )
      if (matchedCount === 0) {
        throw new Error(
          `Notification ${referenceNumber} has no ${obligationId} fulfilment to rewrite — the trader may not have reached the origin page yet.`
        )
      }
    }
  }
}
