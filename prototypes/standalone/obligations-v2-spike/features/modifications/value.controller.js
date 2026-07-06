import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, currency, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { modificationsValuePage as page } from './page.js'
import { modValue } from './obligations.js'

/** Modifications — value (second page of the gated modifications section).
 * The amount carries the optional currency validator. Modifications SPLITS
 * its obligations across two pages, so `collects` is an explicit object-ref
 * subset rather than the `collectsFrom(obligations)` default — this page
 * owns only `modValue`. */
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
  const { errors } = validate(fields, payload)
  if (errors) return render(h, value, errors)

  const { scope } = state.commit(request, h, { modValue: value })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
