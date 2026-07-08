import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as transportReference from '../../services/transport-reference/index.js'
import { transportersPage as page } from './page.js'
import { transporterType } from './obligations.js'

export const meta = { ...page, collects: [transporterType.id] }
const view = `${TEMPLATES}/features/transport/transporters`

const fields = compose(
  oneOf('transporterType', transportReference.transporterTypes())
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Transporter', { backLink: hubPath() }),
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, { transporterType: answers.transporterType ?? '' })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const values = { transporterType: payload.transporterType ?? '' }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  const { scope } = state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
