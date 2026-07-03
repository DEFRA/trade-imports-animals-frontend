import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../state/index.js'
import * as kit from '../_shared/kit.js'

/**
 * Choose your cover. excessAmount is a conditional reveal under
 * voluntaryExcess = Yes — the reveal MARKUP is page-side (govuk
 * conditional), while the scope/wipe of excessAmount lives in the model
 * (activatedBy voluntaryExcess = 'yes', wipeOnExit). Exactly one visible
 * "Yes" label on this page (the voluntary-excess radio).
 */
const page = { id: 'cover-type', slug: 'cover-type' }
export const meta = {
  ...page,
  collects: ['coverType', 'voluntaryExcess', 'excessAmount']
}
const view = `${TEMPLATES}/pages/cover-type/template`

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

const render = (h, values) =>
  h.view(view, {
    ...kit.base('Choose your cover', { backLink: hubPath() }),
    heading: 'Choose your cover',
    values,
    coverOptions: COVER.map((c) => ({
      ...c,
      checked: c.value === values.coverType
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
  const { scope } = state.commit(request, h, {
    coverType: payload.coverType ?? '',
    voluntaryExcess: payload.voluntaryExcess ?? '',
    excessAmount: (payload.excessAmount ?? '').trim()
  })
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
