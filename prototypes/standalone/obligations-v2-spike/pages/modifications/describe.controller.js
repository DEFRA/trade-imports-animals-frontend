import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../state/index.js'
import { compose, maxText, validate } from '../../lib/validate/index.js'
import * as kit from '../_shared/kit.js'

/** Modifications — describe (first page of the gated modifications section).
 * The length cap is a controller-owned `maxText` validator — optional, so a
 * blank field saves. */
const page = {
  id: 'modifications-describe',
  slug: 'addons/modifications/describe'
}
export const meta = { ...page, collects: ['modDescription'] }
const view = `${TEMPLATES}/pages/modifications/describe`

const fields = compose(maxText('modDescription', 200))

const render = (h, value, errors = {}) =>
  h.view(view, {
    ...kit.base('Describe the modifications', { backLink: hubPath() }),
    heading: 'Describe the modifications',
    value,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, answers.modDescription ?? '')
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const value = (payload.modDescription ?? '').trim()
  const { errors } = validate(fields, payload)
  if (errors) return render(h, value, errors)

  const { scope } = state.commit(request, h, { modDescription: value })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
