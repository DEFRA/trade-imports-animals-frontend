import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as importReasonPurpose from '../../services/import-reason-purpose/index.js'
import { importPurposePage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/import-purpose/template`

const fields = compose(
  oneOf(
    'purposeInInternalMarket',
    importReasonPurpose.purposes().map((option) => option.value)
  )
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Purpose in the internal market', { backLink: hubPath() }),
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    purposeOptions: importReasonPurpose.purposes().map((option) => ({
      ...option,
      checked: option.value === values.purposeInInternalMarket
    }))
  })

const get = async (request, h) => {
  const { answers } = await state.get(request, h)
  return render(h, {
    purposeInInternalMarket: answers.purposeInInternalMarket ?? ''
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    purposeInInternalMarket: payload.purposeInInternalMarket ?? ''
  }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  const { scope } = await state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
