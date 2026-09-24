import {
  compose,
  oneOf,
  pageValidation
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

// Contact is mandatory as an obligation, but Save and continue with no
// selection is allowed — the trader returns to the hub with the task
// incomplete. Reject only values that are not in the offered list.
//
// The membership rule ("this id is one the org's book still has") can only be
// stated where the book is in hand. The page itself fetches it for the radios
// and passes it in as `addressOptions`, so it states the rule here. The task
// list and the review page read stored answers without fetching the book —
// they do not need to: the read path already tells the same story. A party
// answer whose address-book reference no longer resolves is dropped from
// `answers` before either of them ever sees it (`withoutUnresolvedPartyRefs`
// in `../addresses/resolve-parties.js`), so `checks` below can tell "deleted"
// from "never answered" by comparing the sanitised value against the raw
// stored one, with no address-book call of its own.
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

// A stored id the sanitiser has already dropped from `answers` is a contact
// that has been deleted since it was picked, not a trader mistake — told
// differently from an out-of-list submission. That comparison only makes
// sense against what is stored: on a submission, an empty selection just
// means the trader has not chosen yet, so the rule is gated to the stored
// reading.
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
  // No toAnswers: the POST commits `answerFor(CONTACT_PARTY, chosen)` built
  // from an address-book record fetched by id, which values alone cannot
  // derive. That stays in the controller exactly as it is today.
})
