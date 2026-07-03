import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../state/index.js'
import * as kit from '../_shared/kit.js'

/** Modifications — describe (first page of the gated modifications section). */
const page = {
  id: 'modifications-describe',
  slug: 'addons/modifications/describe'
}
export const meta = { ...page, collects: ['modDescription'] }
const view = `${TEMPLATES}/pages/modifications/describe`

const render = (h, value) =>
  h.view(view, {
    ...kit.base('Describe the modifications', { backLink: hubPath() }),
    heading: 'Describe the modifications',
    value
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, answers.modDescription ?? '')
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { scope } = state.commit(request, h, {
    modDescription: (payload.modDescription ?? '').trim()
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
