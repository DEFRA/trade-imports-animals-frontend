import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../state/index.js'
import { compose, integerInRange, validate } from '../../lib/validate/index.js'
import * as kit from '../_shared/kit.js'

/** Driving history. hadClaims (Yes/No) is the controlling answer that
 * activates the claims collection — but that relationship lives in the
 * model (activatedBy), not here; this page only writes the answer. The two
 * numeric fields carry controller-owned range validators (optional). */
const page = { id: 'driving-history', slug: 'driving-history' }
export const meta = {
  ...page,
  collects: ['yearsNoClaims', 'hadClaims', 'penaltyPoints']
}
const view = `${TEMPLATES}/pages/driving-history/template`

const fields = compose(
  integerInRange('yearsNoClaims', { min: 0, max: 99 }),
  integerInRange('penaltyPoints', { min: 0, max: 12 })
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Driving history', { backLink: hubPath() }),
    heading: 'Driving history',
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, {
    yearsNoClaims: answers.yearsNoClaims ?? '',
    hadClaims: answers.hadClaims ?? '',
    penaltyPoints: answers.penaltyPoints ?? ''
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    yearsNoClaims: (payload.yearsNoClaims ?? '').trim(),
    hadClaims: payload.hadClaims ?? '',
    penaltyPoints: (payload.penaltyPoints ?? '').trim()
  }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  const { scope } = state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
