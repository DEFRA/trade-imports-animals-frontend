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
  { value: '', text: '──────────', disabled: true },
  ...ports.list().map((port) => ({
    value: port.code,
    text: `${port.name} (${port.code})`,
    selected: port.code === selected
  }))
]

const fields = () =>
  compose(
    oneOf(
      'portOfEntry',
      ports.list().map((port) => port.code)
    ),
    dateParts('arrivalDateAtPort', 'Enter a real arrival date')
  )

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base('Arrival details', { backLink: hubPath(), journey }),
    heading: 'Arrival details',
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    portItems: portItems(values.portOfEntry),
    arrivalDate: kit.dateField('arrivalDateAtPort', {
      label: 'Arrival date at port of entry',
      hint: 'The expected date of arrival at the port of entry. For example, 27/3/2026',
      value: values.arrivalDateAtPort ?? {},
      error: errors['arrivalDateAtPort-day']
    })
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, {
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
  const { errors } = validate(fields(), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, values, errors)
  }

  const { scope } = await state.commit(request, h, values)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
