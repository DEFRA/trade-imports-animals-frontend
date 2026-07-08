import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as importReasonPurpose from '../../services/import-reason-purpose/index.js'
import { importReasonPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/import-reason/template`

// reasonForImport is enforcedAt=submit: blank passes validation and the
// obligation stays an open requirement for the status roll-up (In progress,
// not a validation error). Only an out-of-domain value blocks the save.
const fields = compose(
  oneOf(
    'reasonForImport',
    importReasonPurpose.reasons().map((option) => option.value)
  )
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Reason for import', { backLink: hubPath() }),
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    reasonOptions: importReasonPurpose.reasons().map((option) => ({
      ...option,
      checked: option.value === values.reasonForImport
    }))
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, { reasonForImport: answers.reasonForImport ?? '' })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const values = { reasonForImport: payload.reasonForImport ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  const { scope } = state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
