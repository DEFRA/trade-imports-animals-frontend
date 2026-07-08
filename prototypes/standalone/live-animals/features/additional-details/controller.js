import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as certification from '../../services/certification-purposes/index.js'
import * as commodities from '../../services/commodities/index.js'
import { additionalDetailsPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/additional-details/template`

export const unweanedApplies = (answers) =>
  []
    .concat(answers.commodityLines ?? [])
    .some((line) =>
      commodities.unweanedCommodities().includes(line?.commoditySelection)
    )

const UNWEANED_LABEL = { yes: 'Yes', no: 'No' }

const certifiedField = oneOf(
  'animalsCertifiedFor',
  certification.certificationPurposes().map((option) => option.value)
)
const unweanedField = oneOf(
  'containsUnweanedAnimals',
  Object.keys(UNWEANED_LABEL)
)

const render = (h, values, showUnweaned, errors = {}) =>
  h.view(view, {
    ...kit.base('Additional animal details', { backLink: hubPath() }),
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    showUnweaned,
    certifiedOptions: certification.certificationPurposes().map((option) => ({
      ...option,
      checked: option.value === values.animalsCertifiedFor
    })),
    unweanedOptions: Object.entries(UNWEANED_LABEL).map(([value, text]) => ({
      value,
      text,
      checked: value === values.containsUnweanedAnimals
    }))
  })

const get = (request, h) => {
  const { answers, scope } = state.get(request, h)
  return render(
    h,
    {
      animalsCertifiedFor: answers.animalsCertifiedFor ?? '',
      containsUnweanedAnimals: answers.containsUnweanedAnimals ?? ''
    },
    scope.has('containsUnweanedAnimals')
  )
}

const post = (request, h) => {
  const { scope } = state.get(request, h)
  const showUnweaned = scope.has('containsUnweanedAnimals')
  const payload = request.payload ?? {}
  const values = {
    animalsCertifiedFor: payload.animalsCertifiedFor ?? '',
    containsUnweanedAnimals: payload.containsUnweanedAnimals ?? ''
  }
  const fields = showUnweaned
    ? compose(certifiedField, unweanedField)
    : compose(certifiedField)
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, showUnweaned, errors)

  const { scope: committed } = state.commit(request, h, {
    animalsCertifiedFor: values.animalsCertifiedFor,
    ...(showUnweaned
      ? { containsUnweanedAnimals: values.containsUnweanedAnimals }
      : {})
  })
  return h.redirect(kit.nextTarget(request, page, committed))
}

export const routes = kit.pageRoutes(page, { get, post })
