import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, maxText, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { modificationsDescribePage as page } from './page.js'
import { modDescription } from './obligations.js'

/** Modifications — describe (first page of the gated modifications section).
 * The length cap is a controller-owned `maxText` validator — optional, so a
 * blank field saves. Modifications SPLITS its obligations across two pages,
 * so `collects` is an explicit object-ref subset rather than the
 * `collectsFrom(obligations)` default — this page owns only `modDescription`. */
export const meta = { ...page, collects: [modDescription.id] }
const view = `${TEMPLATES}/features/modifications/describe`

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
