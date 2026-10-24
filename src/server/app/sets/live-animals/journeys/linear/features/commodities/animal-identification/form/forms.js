import * as state from '../../../../../../../../engine/index.js'
import { validate } from '../../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
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
  if (!showAddress) {
    return {}
  }
  const { errors: addrFormatErrors } = addressRecordProvided(addressValues)
    ? validate(addressChecksFor(index), payload)
    : { errors: null }
  return {
    ...missingAddressErrors(addressValues, index),
    ...addrFormatErrors
  }
}

const buildLineForm = (payload, entry, index) => {
  const { commodityCode } = entry
  const values = identifierValuesFromPayload(payload, commodityCode, index)
  const addressValues = addressValuesFromPayload(payload, index)
  const showAddress = permanentAddressApplies(
    commodityCode,
    entry.speciesLatinName
  )
  const holdsData = formHoldsData(showAddress, values, addressValues)

  const { errors: idErrors } = validate(
    identifierChecksFor(commodityCode, index),
    payload
  )
  const errors = {
    ...idErrors,
    ...addressErrorsFor(showAddress, addressValues, index, payload)
  }

  return {
    form: { commodityCode, values, addressValues, showAddress, holdsData },
    errors
  }
}

const capIfAtMax = (answers, index, entry) => {
  const cap = state.collectionCapAt(answers, [
    'commodityLines',
    index,
    'animalIdentifiers'
  ])
  return cap !== null && (entry.animalIdentifiers ?? []).length >= cap
    ? cap
    : null
}

export const buildLineForms = (payload, answers, lines) => {
  const atMaxByIndex = new Map(
    lines
      .map(({ index, entry }) => [index, capIfAtMax(answers, index, entry)])
      .filter(([, cap]) => cap !== null)
  )
  const built = lines
    .filter(({ index }) => !atMaxByIndex.has(index))
    .map(({ index, entry }) => ({
      index,
      ...buildLineForm(payload, entry, index)
    }))
  const forms = new Map(built.map(({ index, form }) => [index, form]))
  const errors = Object.assign({}, ...built.map((line) => line.errors))
  return { forms, atMaxByIndex, errors }
}

export const capReachedResponse = ({
  render,
  request,
  h,
  journey,
  answers,
  evaluation,
  forms,
  addIndex,
  atMaxByIndex
}) => {
  if (addIndex === null || !atMaxByIndex.has(addIndex)) {
    return null
  }
  const cap = atMaxByIndex.get(addIndex)
  request.logger.warn(
    { journeyId: request.params.journeyId, lineIndex: addIndex, cap },
    'Identifier add refused: the line is already at its animal count'
  )
  return render(request, h, journey, answers, evaluation, {
    forms,
    cardErrors: [{ index: addIndex, text: copy.errors.capReached(cap) }]
  })
}

export const withEmptyFormGuard = (errors, forms, addIndex) => {
  const anyData = [...forms.values()].some((form) => form.holdsData)
  if (addIndex === null || anyData || !forms.has(addIndex)) {
    return errors
  }
  const { commodityCode } = forms.get(addIndex)
  const [first] = scopedFields(commodityCode)
  return {
    ...errors,
    [fieldName(first.id, addIndex)]: copy.errors.atLeastOneIdentifier
  }
}
