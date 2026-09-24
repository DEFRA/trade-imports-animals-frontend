import { copyFor } from '../../../../../../../shared/copy.js'
import { revalidators } from '../../../revalidators.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy })

const errorsFor = (perPageErrors, revalidatorId) =>
  perPageErrors.find(({ id }) => id === revalidatorId)?.errors ?? {}

/** Split per-page errors from the aggregator into the two surfaces the review
 * page renders — a single "check this section" line per card, or a per-role
 * summary entry keyed by party id. Each revalidator declares its surface;
 * one loop dispatches without a per-page special-case. */
export const applyPerPageErrors = (perPageErrors) => {
  const cardErrors = {}
  const partyErrors = {}
  for (const { id, surface } of revalidators) {
    const errors = errorsFor(perPageErrors, id)
    if (Object.keys(errors).length === 0) {
      continue
    }
    switch (surface.kind) {
      case 'card':
        cardErrors[surface.cardId] = copy.errors.invalidCards[surface.cardId]
        break
      case 'party':
        Object.assign(partyErrors, errors)
        break
      default:
        throw new Error(
          `Unknown revalidator surface kind "${surface.kind}" for "${id}"`
        )
    }
  }
  return { cardErrors, partyErrors }
}
