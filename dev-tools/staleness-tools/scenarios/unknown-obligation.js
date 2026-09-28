import { obligations } from '../../../src/server/app/sets/live-animals/obligations/index.js'

const GHOST_OBLIGATION_ID = 'eudpa-573-ghost-obligation-abcdef'

// A scenario whose ghost id has crept into the manifest would exercise a
// path that IS known, not one that isn't. Fail loud.
const assertUnknown = () => {
  if (obligations.some((o) => o.id === GHOST_OBLIGATION_ID)) {
    throw new Error(
      `GHOST_OBLIGATION_ID '${GHOST_OBLIGATION_ID}' is now in the manifest — pick a different sentinel.`
    )
  }
}

export const unknownObligation = {
  id: 'unknown-obligation',
  summary:
    'Add a fulfilment for an obligation id the current manifest does not know — engine drops it silently on read',
  mutate: async (notifications, referenceNumber) => {
    assertUnknown()
    const ghost = {
      obligationId: GHOST_OBLIGATION_ID,
      value: 'the-answer-that-nobody-will-ever-see'
    }
    // $addToSet dedupes by deep equality so a re-run adds nothing — keeps
    // the scenario idempotent, like `country-stale` and `party-deleted`.
    const { matchedCount } = await notifications.updateOne(
      { referenceNumber },
      { $addToSet: { fulfilments: ghost } }
    )
    if (matchedCount === 0) {
      throw new Error(
        `Notification ${referenceNumber} not found in the notifications collection.`
      )
    }
  }
}
