import {
  compose,
  oneOf,
  pageValidation
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

// Membership check gated on the caller passing `addressOptions` — only the
// page itself fetches the book. Task list and review page skip this rule.
const fields = (_values, { addressOptions } = {}) =>
  addressOptions
    ? compose(
        oneOf(
          'contactAddress',
          addressOptions.map((option) => option.id),
          copy.errors.contactRequired
        )
      )
    : compose()

export const validation = pageValidation({
  fields,
  fromPayload: (payload) => ({ contactAddress: payload.contactAddress ?? '' }),
  fromAnswers: () => ({ contactAddress: '' })
  // No toAnswers — POST commits `answerFor(CONTACT_PARTY, chosen)` from a
  // book record fetched by id, which values alone can't derive.
})
