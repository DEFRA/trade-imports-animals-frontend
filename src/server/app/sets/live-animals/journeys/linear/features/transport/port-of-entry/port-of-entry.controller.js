import { hubPath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import {
  compose,
  dateTextInRange,
  maxText,
  oneOf,
  validate
} from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as ports from '../../../../../../../services/ports/index.js'
import * as transportReference from '../../../../../../../services/transport-reference/index.js'
import { portOfEntryPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { arrivalWindow } from './arrival-window.js'

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
const view = `${TEMPLATES}/features/transport/port-of-entry/port-of-entry`

const copy = copyFor({ en, cy }).portOfEntry

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

const fields = (dateWindow) =>
  compose(
    dateTextInRange('arrivalDateAtPort', {
      min: dateWindow.min,
      max: dateWindow.max,
      invalidMessage: copy.errors.arrivalDateInvalid,
      rangeMessage: copy.errors.arrivalDateOutOfRange(
        dateWindow.minText,
        dateWindow.maxText
      )
    }),
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

const render = (
  h,
  journey,
  dateWindow,
  values,
  { errors = {}, recoverableError = false } = {}
) =>
  h.view(view, {
    ...kit.base(copy.title, {
      backLink: hubPath(journey.journeyId),
      journey,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    portItems: portItems(values.portOfEntry),
    arrivalDate: kit.dateField('arrivalDateAtPort', {
      label: copy.arrivalDate.label,
      hint: copy.arrivalDate.hint(dateWindow.minText, dateWindow.maxText),
      value: values.arrivalDateAtPort ?? {},
      error: errors.arrivalDateAtPort,
      minDate: dateWindow.minText,
      maxDate: dateWindow.maxText
    })
  })

const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  return render(h, journey, arrivalWindow(), {
    arrivalDateAtPort: answers.arrivalDateAtPort ?? {},
    portOfEntry: answers.portOfEntry ?? '',
    meansOfTransport: answers.meansOfTransport ?? '',
    transportIdentification: answers.transportIdentification ?? '',
    transportDocumentReference: answers.transportDocumentReference ?? ''
  })
}

const post = async (request, h) => {
  const payload = request.payload ?? {}
  // One clock read per request: two would let the widget bounds and the server
  // bounds disagree across a midnight boundary.
  const dateWindow = arrivalWindow()
  const values = {
    arrivalDateAtPort: kit.readDate(payload, 'arrivalDateAtPort'),
    portOfEntry: payload.portOfEntry ?? '',
    meansOfTransport: payload.meansOfTransport ?? '',
    transportIdentification: (payload.transportIdentification ?? '').trim(),
    transportDocumentReference: (
      payload.transportDocumentReference ?? ''
    ).trim()
  }
  const { errors } = validate(fields(dateWindow), payload)
  if (errors) {
    const { journey } = await state.get(request, h)
    return render(h, journey, dateWindow, values, { errors }).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, values)
    },
    async () => {
      const { journey } = await state.get(request, h)
      return render(h, journey, dateWindow, values, {
        recoverableError: true
      }).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  const { scope } = committed
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
