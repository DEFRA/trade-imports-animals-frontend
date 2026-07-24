import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as certification from '../../services/certification-purposes/index.js'
import * as commodities from '../../services/commodities/index.js'
import { additionalDetailsPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = {
  ...page,
  collects: ['animalsCertifiedFor', 'containsUnweanedAnimals']
}
const view = `${TEMPLATES}/features/additional-details/template`

const copy = copyFor({ en, cy })

const HTTP_STATUS_BAD_REQUEST = 400

const asArray = (value) => [].concat(value ?? [])

export const unweanedApplies = (answers) =>
  asArray(answers.commodityLines).some((line) =>
    commodities.unweanedCommodities().includes(line?.commoditySelection)
  )

const UNWEANED_LABEL = { yes: copy.unweaned.yes, no: copy.unweaned.no }

const certifiedField = oneOf(
  'animalsCertifiedFor',
  certification.certificationPurposes().map((option) => option.value)
)
const unweanedField = oneOf(
  'containsUnweanedAnimals',
  Object.keys(UNWEANED_LABEL)
)

const render = (h, journey, values, showUnweaned, errors = {}) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey
    }),
    copy,
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

const get = async (request, h) => {
  const { journey, answers, scope } = await state.get(request, h)
  return render(
    h,
    journey,
    {
      animalsCertifiedFor: answers.animalsCertifiedFor ?? '',
      containsUnweanedAnimals: answers.containsUnweanedAnimals ?? ''
    },
    scope.has('containsUnweanedAnimals')
  )
}

const post = async (request, h) => {
  const { journey, scope } = await state.get(request, h)
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
  if (errors) {
    return render(h, journey, values, showUnweaned, errors).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  const { scope: committed } = await state.commit(request, h, {
    animalsCertifiedFor: values.animalsCertifiedFor,
    ...(showUnweaned
      ? { containsUnweanedAnimals: values.containsUnweanedAnimals }
      : {})
  })
  return h.redirect(await kit.nextTarget(request, page, committed))
}

export const routes = kit.pageRoutes(page, { get, post })
