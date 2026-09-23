import { copyFor } from '../../../../../../shared/copy.js'
import { CONTACT_PARTY } from '../addresses/parties.js'
import { copy as en } from './copy/copy.en.js'
import { copy as cy } from './copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const validateStoredAnswers = async (answers, ctx) => {
  const id = answers[CONTACT_PARTY.id]?.addressId
  if (!id) {
    return {}
  }
  const record = ctx.addressResolutions.get(id)
  if (!record || record.deleted) {
    return { [CONTACT_PARTY.id]: copy.errors.contactNoLongerAvailable }
  }
  return {}
}
