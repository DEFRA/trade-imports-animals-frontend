import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../state/index.js'
import * as kit from '../_shared/kit.js'

/** Named driver — who (first page of the gated named-driver section). */
const page = { id: 'named-driver-who', slug: 'addons/named-driver/who' }
export const meta = { ...page, collects: ['driverName', 'driverDob'] }
const view = `${TEMPLATES}/pages/named-driver/who`

const render = (h, values) =>
  h.view(view, {
    ...kit.base('Named driver', { backLink: hubPath() }),
    heading: 'Named driver',
    values,
    dob: kit.dateField('driverDob', {
      label: 'Date of birth',
      hint: 'For example, 27 3 1985',
      value: values.driverDob ?? {}
    })
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, {
    driverName: answers.driverName ?? '',
    driverDob: answers.driverDob ?? {}
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { scope } = state.commit(request, h, {
    driverName: (payload.driverName ?? '').trim(),
    driverDob: kit.readDate(payload, 'driverDob')
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
