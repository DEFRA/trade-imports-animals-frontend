import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../state/index.js'
import * as kit from '../_shared/kit.js'

/** Your vehicle — all fields soft (save blank). vehiclePhoto is render-only
 * (never stored, spike parity). */
const page = { id: 'your-vehicle', slug: 'your-vehicle' }
export const meta = {
  ...page,
  collects: [
    'registration',
    'make',
    'model',
    'year',
    'estimatedValue',
    'vehiclePhoto'
  ]
}
const view = `${TEMPLATES}/pages/your-vehicle/template`
const MAKES = ['Audi', 'BMW', 'Ford', 'Nissan', 'Toyota', 'Volkswagen']

const render = (h, values) =>
  h.view(view, {
    ...kit.base('Your vehicle', { backLink: hubPath() }),
    heading: 'Your vehicle',
    values,
    makes: MAKES
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, {
    registration: answers.registration ?? '',
    make: answers.make ?? '',
    model: answers.model ?? '',
    year: answers.year ?? '',
    estimatedValue: answers.estimatedValue ?? ''
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { scope } = state.commit(request, h, {
    registration: (payload.registration ?? '').trim(),
    make: (payload.make ?? '').trim(),
    model: (payload.model ?? '').trim(),
    year: (payload.year ?? '').trim(),
    estimatedValue: (payload.estimatedValue ?? '').trim()
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
