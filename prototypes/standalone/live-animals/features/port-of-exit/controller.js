import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import { compose, requiredOneOf, validate } from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as ports from '../../services/ports/index.js'
import { portOfExitPage as page } from './page.js'

export const meta = { ...page, collects: ['portOfExit'] }
const view = `${TEMPLATES}/features/port-of-exit/template`

const portItems = (selected) => [
  { value: '', text: 'Select port of exit' },
  { value: '', text: '──────────', disabled: true },
  ...ports.list().map((port) => ({
    value: port.code,
    text: `${port.name} (${port.code})`,
    selected: port.code === selected
  }))
]

const fields = () =>
  compose(
    requiredOneOf(
      'portOfExit',
      ports.list().map((port) => port.code),
      'Select the port of exit'
    )
  )

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Port of exit', { backLink: hubPath(), journey }),
    heading: 'Port of exit',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    portItems: portItems(values.portOfExit)
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, { portOfExit: answers.portOfExit ?? '' })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = { portOfExit: payload.portOfExit ?? '' }
  const { errors } = validate(fields(), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors)
  }

  const { scope } = await state.commit(request, h, values)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
