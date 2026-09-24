import { copyFor } from '../../../../../../../shared/copy.js'
import * as transporters from '../../../../../../../services/transporters/index.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'

const copy = copyFor({ en, cy }).transporters

// The controller matches the stored transporter to the register by nameKey
// (see selectedIdFor in transporters.controller.js), so a rename in the
// register is not a stale-state on its own. Only a name the register no
// longer holds is.
export const validateStoredAnswers = async (answers, ctx) => {
  const chosenName =
    answers.commercialTransporter?.name ?? answers.privateTransporter?.name
  if (!chosenName) {
    return {}
  }
  const chosenKey = transporters.nameKey(chosenName)
  if (!ctx.transporterRegister.has(chosenKey)) {
    return { transporter: copy.errors.transporterNoLongerAvailable }
  }
  return {}
}
