import * as state from '../../../../../../../../engine/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { addressRecordProvided } from '../address/fields.js'

const copy = copyFor({ en, cy }).identification

const unitFromForm = (form) => {
  const unit = { ...form.values }
  if (form.showAddress && addressRecordProvided(form.addressValues)) {
    unit.permanentAddress = {
      name: form.addressValues.nameOrOrganisationName,
      address: {
        addressLine1: form.addressValues.addressLine1,
        addressLine2: form.addressValues.addressLine2,
        townOrCity: form.addressValues.townOrCity,
        county: form.addressValues.county,
        postalOrZipCode: form.addressValues.postalOrZipCode,
        telephoneNumber: form.addressValues.telephoneNumber,
        emailAddress: form.addressValues.emailAddress
      }
    }
  }
  return unit
}

const recordCapFailure = async (request, h, index) => {
  const { answers: current } = await state.get(request, h)
  const cap = state.collectionCapAt(current, [
    'commodityLines',
    index,
    'animalIdentifiers'
  ])
  return { index, text: copy.errors.capReached(cap) }
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
