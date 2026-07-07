import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, currency, oneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import { coverTypePage as page } from './page.js'
import { obligations } from './obligations.js'

/**
 * Choose your cover. excessAmount is a conditional reveal under
 * voluntaryExcess = Yes — the reveal MARKUP is page-side (govuk
 * conditional), while the scope/wipe of excessAmount lives in the model
 * (activatedBy voluntaryExcess = 'yes', wipeOnExit). Exactly one visible
 * "Yes" label on this page (the voluntary-excess radio). coverType's value
 * domain is a controller-owned `oneOf`.
 */
export const meta = { ...page, collects: kit.collectsFrom(obligations) }
const view = `${TEMPLATES}/features/cover-type/template`

const COVER = [
  {
    value: 'comprehensive',
    text: 'Comprehensive',
    hint: { text: 'Covers you, your car and other people' }
  },
  {
    value: 'third-party-fire-theft',
    text: 'Third party, fire and theft',
    hint: { text: 'Covers other people, plus fire and theft of your car' }
  },
  {
    value: 'third-party',
    text: 'Third party only',
    hint: { text: 'Covers other people only' }
  }
]

const fields = compose(
  oneOf(
    'coverType',
    COVER.map((cover) => cover.value)
  ),
  currency('excessAmount')
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Choose your cover', { backLink: hubPath() }),
    heading: 'Choose your cover',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    coverOptions: COVER.map((cover) => ({
      ...cover,
      checked: cover.value === values.coverType
    }))
  })

const get = (request, h) => {
  const { answers } = state.get(request, h)
  return render(h, {
    coverType: answers.coverType ?? '',
    voluntaryExcess: answers.voluntaryExcess ?? '',
    excessAmount: answers.excessAmount ?? ''
  })
}

const post = (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    coverType: payload.coverType ?? '',
    voluntaryExcess: payload.voluntaryExcess ?? '',
    excessAmount: (payload.excessAmount ?? '').trim()
  }
  const { value: clean, errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  const { scope } = state.commit(request, h, {
    ...values,
    excessAmount: clean.excessAmount ?? ''
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
