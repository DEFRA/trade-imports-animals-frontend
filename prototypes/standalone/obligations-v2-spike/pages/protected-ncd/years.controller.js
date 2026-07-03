import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../state/index.js'
import * as kit from '../_shared/kit.js'

/** Protect your no-claims discount — years (the gated protected-ncd section). */
const page = { id: 'protected-ncd-years', slug: 'addons/protected-ncd/years' }
export const meta = { ...page, collects: ['ncdYears'] }
const view = `${TEMPLATES}/pages/protected-ncd/years`

const render = (h, value) =>
  h.view(view, {
    ...kit.base('Protect your no-claims discount', { backLink: hubPath() }),
    heading: 'Protect your no-claims discount',
    value
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, answers.ncdYears ?? '')
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { scope } = state.commit(request, h, {
    ncdYears: (payload.ncdYears ?? '').trim()
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
