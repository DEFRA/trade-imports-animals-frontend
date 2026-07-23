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
import { copyFor } from '../../shared/copy.js'
import * as ports from '../../services/ports/index.js'
import * as transportReference from '../../services/transport-reference/index.js'
import { portOfEntryPage as page } from './page.js'
import { copy as en } from './copy.en.js'
import { copy as cy } from './copy.cy.js'

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

const copy = copyFor({ en, cy }).portOfEntry

const HTTP_STATUS_BAD_REQUEST = 400

const TRANSPORT_FIELD_MAX_LENGTH = 58

const portItems = (selected) => [
  { value: '', text: copy.port.placeholder },
  { value: '', text: '──────────', disabled: true },
  ...ports.list().map((port) => ({
    value: port.code,
    text: `${port.name} (${port.code})`,
    selected: port.code === selected
  }))
]

const fields = () =>
  compose(
    dateParts('arrivalDateAtPort', copy.errors.arrivalDateInvalid),
    oneOf(
      'portOfEntry',
      ports.list().map((port) => port.code)
    ),
    oneOf('meansOfTransport', transportReference.meansOfTransport()),
    maxText(
      'transportIdentification',
      TRANSPORT_FIELD_MAX_LENGTH,
      copy.errors.identificationMaxLength
    ),
    maxText(
      'transportDocumentReference',
      TRANSPORT_FIELD_MAX_LENGTH,
      copy.errors.documentReferenceMaxLength
    )
  )

const render = (h, journey, values, errors = {}) =>
  h.view(view, {
    ...kit.base(copy.title, { backLink: hubPath(), journey }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    portItems: portItems(values.portOfEntry),
    arrivalDate: kit.dateField('arrivalDateAtPort', {
      label: copy.arrivalDate.label,
      hint: copy.arrivalDate.hint,
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
    return render(h, journey, values, errors).code(HTTP_STATUS_BAD_REQUEST)
  }

  const { scope } = await state.commit(request, h, values)
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
