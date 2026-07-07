import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, currency, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { modificationsValuePage as page } from './page.js'
import { modValue } from './obligations.js'

export const meta = { ...page, collects: [modValue.id] }
const view = `${TEMPLATES}/features/modifications/value`

const fields = compose(currency('modValue'))

const render = (h, value, errors = {}) =>
  h.view(view, {
    ...kit.base('Value of the modifications', { backLink: hubPath() }),
    heading: 'Value of the modifications',
    value,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, answers.modValue ?? '')
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const value = (payload.modValue ?? '').trim()
  const { value: clean, errors } = validate(fields, payload)
  if (errors) return render(h, value, errors)

  const { scope } = state.commit(request, h, {
    modValue: clean.modValue ?? ''
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
