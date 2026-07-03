import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'

/** Named driver — relationship (second page of the gated section). The value
 * domain is a controller-owned `oneOf`. */
const page = {
  id: 'named-driver-relationship',
  slug: 'addons/named-driver/relationship'
}
export const meta = { ...page, collects: ['relationship'] }
const view = `${TEMPLATES}/features/named-driver/relationship`

const OPTIONS = [
  { value: 'spouse', text: 'Spouse or partner' },
  { value: 'child', text: 'Son or daughter' },
  { value: 'parent', text: 'Parent' },
  { value: 'other', text: 'Someone else' }
]

const fields = compose(
  oneOf(
    'relationship',
    OPTIONS.map((o) => o.value)
  )
)

const render = (h, value, errors = {}) =>
  h.view(view, {
    ...kit.base('Relationship to you', { backLink: hubPath() }),
    heading: 'Relationship to you',
    errorSummary: kit.errorSummary(errors),
    options: OPTIONS.map((o) => ({ ...o, checked: o.value === value }))
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, answers.relationship ?? '')
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { errors } = validate(fields, payload)
  if (errors) return render(h, payload.relationship ?? '', errors)

  const { scope } = state.commit(request, h, {
    relationship: payload.relationship ?? ''
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
