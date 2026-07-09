import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import {
  compose,
  dateParts,
  oneOf,
  validate
} from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as ports from '../../services/ports/index.js'
import { portOfEntryPage as page } from './page.js'
import { arrivalDateAtPort, portOfEntry } from './obligations.js'

export const meta = {
  ...page,
  collects: [portOfEntry.id, arrivalDateAtPort.id]
}
const view = `${TEMPLATES}/features/transport/port-of-entry`

const portItems = (selected) => [
  { value: '', text: 'Select port of entry' },
  { text: '──────────', disabled: true },
  ...ports.list().map((value) => ({
    value,
    text: value,
    selected: value === selected
  }))
]

const fields = compose(
  oneOf('portOfEntry', ports.list()),
  dateParts('arrivalDateAtPort', 'Enter a real arrival date')
)

const render = (h, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Port of entry', { backLink: hubPath() }),
    heading: 'Port of entry',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    portItems: portItems(values.portOfEntry),
    arrivalDate: kit.dateField('arrivalDateAtPort', {
      label: 'When will the consignment arrive at the port of entry?',
      hint: 'For example, 12 12 2026',
      value: values.arrivalDateAtPort ?? {},
      error: errors['arrivalDateAtPort-day']
    })
  })

const get = async (request, h) => {
  const { answers } = await state.get(request, h)
  return render(h, {
    portOfEntry: answers.portOfEntry ?? '',
    arrivalDateAtPort: answers.arrivalDateAtPort ?? {}
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    portOfEntry: payload.portOfEntry ?? '',
    arrivalDateAtPort: kit.readDate(payload, 'arrivalDateAtPort')
  }
  const { errors } = validate(fields, payload)
  if (errors) return render(h, values, errors)

  const { scope } = await state.commit(request, h, values)
  return h.redirect(kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
