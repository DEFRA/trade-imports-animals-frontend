import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import * as kit from '../../shared/kit.js'
import { emailPage as page } from './page.js'
import { obligations } from './obligations.js'

/** Email gate — the first task. Saves blank freely (soft); no page-hard mandate. */
export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/email/template`

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Give us your email to begin', { backLink: hubPath() }),
    heading: 'Give us your email to begin',
    values,
    errors,
    errorSummary: kit.errorSummary(errors)
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, { email: answers.email ?? '' })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const { scope } = state.commit(request, h, {
    email: (payload.email ?? '').trim()
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
