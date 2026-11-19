import {
  compose,
  oneOf,
  pageValidation,
  requiredOneOf
} from '../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../shared/copy.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

const contactAddressRule = (stored, ids) =>
  stored
    ? oneOf('contactAddress', ids)
    : requiredOneOf('contactAddress', ids, copy.errors.contactRequired)

const fields = (_values, { addressOptions, stored } = {}) =>
  addressOptions
    ? compose(
        contactAddressRule(
          stored,
          addressOptions.map((option) => option.id)
        )
      )
    : compose()

export const validation = pageValidation({
  fields,
  fromPayload: (payload) => ({ contactAddress: payload.contactAddress ?? '' }),
  fromAnswers: () => ({ contactAddress: '' })
})
