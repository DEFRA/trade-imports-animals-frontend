import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../state/index.js'
import * as kit from '../_shared/kit.js'

/** Driving history. hadClaims (Yes/No) is the controlling answer that
 * activates the claims collection — but that relationship lives in the
 * model (activatedBy), not here; this page only writes the answer. */
const page = { id: 'driving-history', slug: 'driving-history' }
export const meta = {
  ...page,
  collects: ['yearsNoClaims', 'hadClaims', 'penaltyPoints']
}
const view = `${TEMPLATES}/pages/driving-history/template`

const render = (h, values) =>
  h.view(view, {
    ...kit.base('Driving history', { backLink: hubPath() }),
    heading: 'Driving history',
    values
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
  const { scope } = state.commit(request, h, {
    yearsNoClaims: (payload.yearsNoClaims ?? '').trim(),
    hadClaims: payload.hadClaims ?? '',
    penaltyPoints: (payload.penaltyPoints ?? '').trim()
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
