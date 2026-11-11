import { validate } from '../../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { fieldName } from '../fields.js'
import {
  identifierChecksFor,
  identifierValuesFromPayload,
  scopedFields
} from '../identifier/fields.js'
import { holdsOneAnimal, identifierCapOf, isAtCap } from '../line-cap.js'

const copy = copyFor({ en, cy }).identification

const identifierProvided = (values) =>
  Object.values(values).some((value) => value !== '')

export const parseAddAction = (action) =>
  action.startsWith('add:') ? Number(action.slice('add:'.length)) : null

const isImplicitSubmitAction = (action) => action === 'implicit-submit'

const lineHoldsOneAnimal = (answers, index) =>
  holdsOneAnimal(identifierCapOf(answers, index))

export const staysOnIdentification = (action, forms, answers) =>
  parseAddAction(action) !== null ||
  (isImplicitSubmitAction(action) &&
    [...forms].some(
      ([index, form]) => form.holdsData && !lineHoldsOneAnimal(answers, index)
    ))

const buildLineForm = (payload, entry, index) => {
  const { commodityCode } = entry
  const values = identifierValuesFromPayload(payload, commodityCode, index)
  const holdsData = identifierProvided(values)

  const { errors } = validate(
    identifierChecksFor(commodityCode, index),
    payload
  )

  return {
    form: { commodityCode, values, holdsData },
    errors
  }
}

const capIfAtCap = (answers, { index, entry }) => {
  const cap = identifierCapOf(answers, index)
  return isAtCap(cap, (entry.animalIdentifiers ?? []).length) ? cap : null
}

const linesToReadFormsFor = (action, answers, lines) => {
  if (isImplicitSubmitAction(action)) {
    return lines
  }
  const addIndex = parseAddAction(action)
  return addIndex === null
    ? lines.filter(({ index }) => lineHoldsOneAnimal(answers, index))
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
  current,
  forms,
  addIndex,
  capByLineAtCap
}) => {
  if (addIndex === null || !capByLineAtCap.has(addIndex)) {
    return null
  }
  const cap = capByLineAtCap.get(addIndex)
  return render(request, h, current, {
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
