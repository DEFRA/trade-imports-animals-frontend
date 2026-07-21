import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { copyFor } from '../../shared/copy.js'
import * as importReasonPurpose from '../../services/import-reason-purpose/index.js'
import { importReasonPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

export const meta = { ...page, collects: ['reasonForImport'] }
const view = `${TEMPLATES}/features/import-reason/template`

const copy = copyFor({ en, cy })

const fields = compose(
  oneOf(
    'reasonForImport',
    importReasonPurpose.reasons().map((option) => option.value)
  )
)

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base(copy.title, { backLink: hubPath(), journey }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    reasonOptions: importReasonPurpose.reasons().map((option) => ({
      ...option,
      hint: { text: copy.reasonHints[option.value] },
      checked: option.value === values.reasonForImport
    }))
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, { reasonForImport: answers.reasonForImport ?? '' })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { reasonForImport: payload.reasonForImport ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors)
  }

  const { scope } = await state.commit(request, h, values)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
