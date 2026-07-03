import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../state/index.js'
import { compose, integerInRange, validate } from '../../lib/validate/index.js'
import * as kit from '../_shared/kit.js'

/** Protect your no-claims discount — years (the gated protected-ncd section).
 * The range is a controller-owned validator. */
const page = { id: 'protected-ncd-years', slug: 'addons/protected-ncd/years' }
export const meta = { ...page, collects: ['ncdYears'] }
const view = `${TEMPLATES}/pages/protected-ncd/years`

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
