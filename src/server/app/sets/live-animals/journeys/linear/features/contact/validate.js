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
// page itself fetches the book. Task list and review page skip this rule and
// rely on `checks` below, which uses the sanitiser-vs-stored diff instead.
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

// A stored id the sanitiser has already dropped from `answers`
// (`withoutUnresolvedPartyRefs`) is a deleted contact, not an empty
// submission — told with its own message. Gated to stored: an empty submit
// just means not-yet-chosen.
const checks = (values, { storedAnswers, stored } = {}) =>
  stored && storedAnswers?.contactAddress?.addressId && !values.contactAddress
    ? { contactAddress: copy.errors.contactNoLongerAvailable }
    : {}

export const validation = pageValidation({
  fields,
  checks,
  fromPayload: (payload) => ({ contactAddress: payload.contactAddress ?? '' }),
  fromAnswers: (answers) => ({
    contactAddress: answers.contactAddress?.addressId ?? ''
  })
  // No toAnswers — POST commits `answerFor(CONTACT_PARTY, chosen)` from a
  // book record fetched by id, which values alone can't derive.
})
