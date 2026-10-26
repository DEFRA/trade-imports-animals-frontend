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
import { holdsOneAnimal, identifierCapOf, isAtCap } from '../line-cap.js'

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

const capIfAtCap = (answers, { index, entry }) => {
  const cap = identifierCapOf(answers, index)
  return isAtCap(cap, (entry.animalIdentifiers ?? []).length) ? cap : null
}

const linesToReadFormsFor = (action, answers, lines) => {
  const addIndex = parseAddAction(action)
  return addIndex === null
    ? lines.filter(({ index }) =>
        holdsOneAnimal(identifierCapOf(answers, index))
      )
    : lines.filter(({ index }) => index === addIndex)
}

export const buildLineForms = (payload, answers, lines, action) => {
  const capByLineAtCap = new Map(
    lines
      .map((line) => [line.index, capIfAtCap(answers, line)])
      .filter(([, cap]) => cap !== null)
  )
  const built = linesToReadFormsFor(action, answers, lines)
    .filter(({ index }) => !capByLineAtCap.has(index))
    .map(({ index, entry }) => ({
      index,
      ...buildLineForm(payload, entry, index)
    }))
  const forms = new Map(built.map(({ index, form }) => [index, form]))
  const errors = Object.assign({}, ...built.map((line) => line.errors))
  return { forms, capByLineAtCap, errors }
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
  capByLineAtCap
}) => {
  if (addIndex === null || !capByLineAtCap.has(addIndex)) {
    return null
  }
  const cap = capByLineAtCap.get(addIndex)
  return render(request, h, journey, answers, evaluation, {
    forms,
    cardErrors: [{ index: addIndex, cap, text: copy.errors.capReached(cap) }]
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
