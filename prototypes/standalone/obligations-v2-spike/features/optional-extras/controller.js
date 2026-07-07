import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { optionalExtrasPage as page } from './page.js'
import { obligations } from './obligations.js'

/** Optional extras — a multi-select. Optional (saves empty). */
export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/optional-extras/template`

const EXTRAS = [
  { value: 'breakdown', text: 'Breakdown cover' },
  { value: 'courtesy-car', text: 'Courtesy car' },
  { value: 'legal', text: 'Motor legal protection' },
  { value: 'windscreen', text: 'Windscreen cover' }
]

const render = (h, selected) =>
  h.view(view, {
    ...kit.base('Optional extras', { backLink: hubPath() }),
    heading: 'Optional extras',
    options: EXTRAS.map((extra) => ({
      ...extra,
      checked: selected.includes(extra.value)
    }))
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, [].concat(answers.extras ?? []))
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { scope } = state.commit(request, h, {
    extras: [].concat(payload.extras ?? [])
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
