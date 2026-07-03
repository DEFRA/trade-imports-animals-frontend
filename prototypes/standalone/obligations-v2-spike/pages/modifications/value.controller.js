import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../state/index.js'
import * as kit from '../_shared/kit.js'

/** Modifications — value (second page of the gated modifications section). */
const page = { id: 'modifications-value', slug: 'addons/modifications/value' }
export const meta = { ...page, collects: ['modValue'] }
const view = `${TEMPLATES}/pages/modifications/value`

const render = (h, value) =>
  h.view(view, {
    ...kit.base('Value of the modifications', { backLink: hubPath() }),
    heading: 'Value of the modifications',
    value
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, answers.modValue ?? '')
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { scope } = state.commit(request, h, {
    modValue: (payload.modValue ?? '').trim()
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
