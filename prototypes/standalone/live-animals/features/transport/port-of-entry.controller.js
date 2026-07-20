import { hubPath, TEMPLATES } from '../../config.js'
import * as state from '../../engine/index.js'
import {
  compose,
  dateParts,
  maxText,
  oneOf,
  validate
} from '../../lib/validate/index.js'
import * as kit from '../../shared/kit.js'
import * as ports from '../../services/ports/index.js'
import * as transportReference from '../../services/transport-reference/index.js'
import { portOfEntryPage as page } from './page.js'

export const meta = {
  ...page,
  collects: [
    'arrivalDateAtPort',
    'portOfEntry',
    'meansOfTransport',
    'transportIdentification',
    'transportDocumentReference'
  ]
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
    dateParts('arrivalDateAtPort', 'Enter a real arrival date'),
    oneOf(
      'portOfEntry',
      ports.list().map((port) => port.code)
    ),
    oneOf('meansOfTransport', transportReference.meansOfTransport()),
    maxText(
      'transportIdentification',
      58,
      'Transport identification must be 58 characters or less'
    ),
    maxText(
      'transportDocumentReference',
      58,
      'Transport document reference must be 58 characters or less'
    )
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
    arrivalDateAtPort: answers.arrivalDateAtPort ?? {},
    portOfEntry: answers.portOfEntry ?? '',
    meansOfTransport: answers.meansOfTransport ?? '',
    transportIdentification: answers.transportIdentification ?? '',
    transportDocumentReference: answers.transportDocumentReference ?? ''
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  const values = {
    arrivalDateAtPort: kit.readDate(payload, 'arrivalDateAtPort'),
    portOfEntry: payload.portOfEntry ?? '',
    meansOfTransport: payload.meansOfTransport ?? '',
    transportIdentification: (payload.transportIdentification ?? '').trim(),
    transportDocumentReference: (
      payload.transportDocumentReference ?? ''
    ).trim()
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
