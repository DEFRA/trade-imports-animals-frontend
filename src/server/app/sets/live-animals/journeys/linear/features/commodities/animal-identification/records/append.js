import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { identifierCapOf } from '../line-cap.js'

const copy = copyFor({ en, cy }).identification

const unitFromForm = (form) => ({ ...form.values })

const recordCapFailure = async (request, h, index) => {
  const { answers: current } = await state.get(request, h)
  const cap = identifierCapOf(current, index)
  return { index, cap, text: copy.errors.capReached(cap) }
}

export const appendLineRecords = async (request, h, forms) => {
  const cardErrors = []
  for (const [index, form] of forms) {
    if (!form.holdsData) {
      continue
    }
    const appended = await state.appendEntryAt(
      request,
      h,
      ['commodityLines', index, 'animalIdentifiers'],
      unitFromForm(form)
    )
    if (appended === null) {
      cardErrors.push(await recordCapFailure(request, h, index))
    }
  }
  return cardErrors
}
