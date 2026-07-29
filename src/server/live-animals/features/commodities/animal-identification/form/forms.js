import * as state from '../../../../engine/index.js'
import { validate } from '../../../../lib/validate/index.js'
import { copyFor } from '../../../../shared/copy.js'
import { copy as en } from '../../copy.en.js'
import { copy as cy } from '../../copy.cy.js'
import {
  addressChecksFor,
  addressRecordProvided,
  addressValuesFromPayload,
  missingAddressErrors
} from '../address/fields.js'
import { fieldName } from '../fields.js'
import {
  identifierChecksFor,
  identifierValuesFromPayload,
  permanentAddressApplies,
  scopedFields
} from '../identifier/fields.js'

const copy = copyFor({ en, cy }).identification

const identifierProvided = (values) =>
  Object.values(values).some((value) => value !== '')

export const parseAddAction = (action) =>
  action.startsWith('add:') ? Number(action.slice('add:'.length)) : null

const formHoldsData = (showAddress, values, addressValues) =>
  identifierProvided(values) ||
  (showAddress && addressRecordProvided(addressValues))

const addressErrorsFor = (showAddress, addressValues, index, payload) => {
  if (!showAddress) return {}
  const { errors: addrFormatErrors } = addressRecordProvided(addressValues)
    ? validate(addressChecksFor(index), payload)
    : { errors: null }
  return {
    ...missingAddressErrors(addressValues, index),
    ...(addrFormatErrors ?? {})
  }
}

const buildLineForm = (payload, commodity, index) => {
  const values = identifierValuesFromPayload(payload, commodity, index)
  const addressValues = addressValuesFromPayload(payload, index)
  const showAddress = permanentAddressApplies(commodity)
  const holdsData = formHoldsData(showAddress, values, addressValues)

  const { errors: idErrors } = validate(
    identifierChecksFor(commodity, index),
    payload
  )
  const errors = {
    ...(idErrors ?? {}),
    ...addressErrorsFor(showAddress, addressValues, index, payload)
  }

  return {
    form: { commodity, values, addressValues, showAddress, holdsData },
    errors
  }
}

export const buildLineForms = (payload, answers, lines) => {
  const forms = new Map()
  const atMaxByIndex = new Map()
  let errors = {}
  for (const { index, entry } of lines) {
    const commodity = entry.commoditySelection
    const cap = state.collectionCapAt(answers, [
      'commodityLines',
      index,
      'animalIdentifiers'
    ])
    if (cap !== null && (entry.animalIdentifiers ?? []).length >= cap) {
      atMaxByIndex.set(index, cap)
      continue
    }
    const { form, errors: lineErrors } = buildLineForm(
      payload,
      commodity,
      index
    )
    forms.set(index, form)
    errors = { ...errors, ...lineErrors }
  }
  return { forms, atMaxByIndex, errors }
}

// "Save and add another" pressed against a card already at its cap — a
// stale form racing the engine-enforced cardinality link. Surface the
// rejection; never save silently.
export const capReachedResponse = (
  render,
  request,
  h,
  journey,
  answers,
  evaluation,
  forms,
  addIndex,
  atMaxByIndex
) => {
  if (addIndex === null || !atMaxByIndex.has(addIndex)) return null
  return render(request, h, journey, answers, evaluation, {
    forms,
    cardErrors: [
      {
        index: addIndex,
        text: copy.errors.capReached(atMaxByIndex.get(addIndex))
      }
    ]
  })
}

// "Save and add another" pressed on a card with nothing entered anywhere:
// never append an empty record — name the gap instead.
export const withEmptyFormGuard = (errors, forms, addIndex) => {
  const anyData = [...forms.values()].some((form) => form.holdsData)
  if (addIndex === null || anyData || !forms.has(addIndex)) return errors
  const { commodity } = forms.get(addIndex)
  const [first] = scopedFields(commodity)
  return {
    ...errors,
    [fieldName(first.id, addIndex)]: copy.errors.atLeastOneIdentifier
  }
}
