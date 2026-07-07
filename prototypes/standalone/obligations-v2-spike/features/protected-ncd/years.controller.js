import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, integerInRange, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { protectedNcdYearsPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/protected-ncd/years`

const fields = compose(integerInRange('ncdYears', { min: 1, max: 99 }))

const render = (h, value, errors = {}) =>
  h.view(view, {
    ...kit.base('Protect your no-claims discount', { backLink: hubPath() }),
    heading: 'Protect your no-claims discount',
    value,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, answers.ncdYears ?? '')
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const value = (payload.ncdYears ?? '').trim()
  const { errors } = validate(fields, payload)
  if (errors) return render(h, value, errors)

  const { scope } = state.commit(request, h, { ncdYears: value })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
