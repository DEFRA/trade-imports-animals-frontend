import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import {
  compose,
  maxText,
  requiredOneOf,
  validate
} from '../../../../../../../lib/validate/index.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as kit from '../../../../../../../shared/kit.js'
import { hubPath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import {
  COUNTRIES,
  countryOptions,
  ukSubdivisionOptions
} from '../../../../../services/reference/countries.js'
import { copy as cy } from '../copy/copy.cy.js'
import { copy as en } from '../copy/copy.en.js'
import { originOfImportPage as page } from '../page.js'

export const meta = {
  ...page,
  collects: ['countryOfConsignment', 'internalReference']
}

const view = `${TEMPLATES}/features/origin/origin-of-import/origin-of-import`
const featureCopy = copyFor({ en, cy })
const copy = featureCopy.originOfImport
const INTERNAL_REFERENCE_MAX_LENGTH = 30

const countryItems = () => {
  const options = countryOptions()
  const ukPosition = options.findIndex(({ value }) => value === 'UM')
  return [
    { value: '', text: copy.countryOfConsignment.placeholder },
    ...options.slice(0, ukPosition),
    {
      label: featureCopy.countryOfOrigin.country.ukGroupLabel,
      items: ukSubdivisionOptions()
    },
    ...options.slice(ukPosition)
  ]
}

const fields = () =>
  compose(
    requiredOneOf(
      'countryOfConsignment',
      COUNTRIES.map(({ code }) => code),
      copy.errors.countryOfConsignmentRequired
    ),
    maxText(
      'internalReference',
      INTERNAL_REFERENCE_MAX_LENGTH,
      copy.errors.internalReferenceMaxLength
    )
  )

const valuesFrom = (source) => ({
  countryOfConsignment: source.countryOfConsignment ?? '',
  internalReference: source.internalReference ?? ''
})

const render = (h, journey, values, errors = {}, recoverableError = false) =>
  h.view(view, {
    ...kit.base(copy.pageTitle, {
      backLink: hubPath(journey.journeyId),
      journey,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    countryItems: countryItems()
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, valuesFrom(answers))
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = valuesFrom(payload)
  const { value, errors } = validate(fields(), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors).code(HTTP_STATUS_BAD_REQUEST)
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, {
        countryOfConsignment: value.countryOfConsignment,
        internalReference: value.internalReference ?? ''
      })
    },
    async () => {
      const { journey } = await state.get(request, h)
      return render(h, journey, values, {}, true).code(
        HTTP_STATUS_INTERNAL_SERVER_ERROR
      )
    }
  )
  if (failure) {
    return failure
  }

  return h.redirect(await kit.nextTarget(request, page, committed.scope))
}

export const routes = kit.pageRoutes(page, { get, post })
