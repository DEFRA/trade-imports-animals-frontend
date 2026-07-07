import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { addonsPage as page } from './page.js'
import { obligations } from './obligations.js'

export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/addons/template`

const ADDONS = [
  { value: 'named-driver', text: 'Add a named driver' },
  { value: 'modifications', text: 'Declare vehicle modifications' },
  { value: 'protected-ncd', text: 'Protect your no-claims discount' }
]

const render = (h, selected) =>
  h.view(view, {
    ...kit.base('Add to your policy', { backLink: hubPath() }),
    heading: 'Add to your policy',
    options: ADDONS.map((addon) => ({
      ...addon,
      checked: selected.includes(addon.value)
    }))
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, [].concat(answers.addons ?? []))
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { scope } = state.commit(request, h, {
    addons: [].concat(payload.addons ?? [])
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
