import { hubPath } from '../../../../../../../shared/paths.js'
import { TEMPLATES } from '../../../config.js'
import * as state from '../../../../../../../engine/index.js'
import {
  HTTP_STATUS_BAD_REQUEST,
  HTTP_STATUS_INTERNAL_SERVER_ERROR
} from '../../../../../../../lib/http-status.js'
import { hasErrors } from '../../../../../../../lib/validate/index.js'
import * as kit from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as ports from '../../../../../../../services/ports/index.js'
import * as transportReference from '../../../../../../../services/transport-reference/index.js'
import { portOfEntryPage as page } from '../page.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { arrivalWindow } from './arrival-window.js'
import { validation } from './validate.js'

export const meta = {
  ...page,
  collects: [
    'arrivalDateAtPort',
    'portOfEntry',
    'meansOfTransport',
    'transportIdentification',
    'transportDocumentReference'
  ],
  validation
}
const view = `${TEMPLATES}/features/transport/port-of-entry/port-of-entry`

const copy = copyFor({ en, cy }).portOfEntry

const portItems = async (selected) => [
  { value: '', text: copy.port.placeholder },
  ...(await ports.list()).map((port) => ({
    value: port.code,
    text: `${port.name} (${port.code})`,
    selected: port.code === selected
  }))
]

const meansItems = (selected) => [
  { value: '', text: copy.means.placeholder },
  ...transportReference.meansOfTransport().map((code) => ({
    value: code,
    text: copy.means.options[code],
    selected: code === selected
  }))
]

const render = async (
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
      page,
      recoverableError
    }),
    copy,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    portItems: await portItems(values.portOfEntry),
    meansItems: meansItems(values.meansOfTransport),
    arrivalDate: kit.dateField('arrivalDateAtPort', {
      label: copy.arrivalDate.label,
      hint: copy.arrivalDate.hint(dateWindow.exampleText),
      value: values.arrivalDateAtPort ?? {},
      error: errors.arrivalDateAtPort,
      minDate: dateWindow.minText,
      maxDate: dateWindow.maxText,
      // Opens the calendar in the flow of the page so it pushes the port and
      // transport questions down rather than covering them.
      formGroupClasses: 'app-date-picker'
    })
  })

// The stored answers go back through the page's own rules on the way in, so an
// answer the reference data has moved past is named here rather than surviving
// to the review page. A port that is no longer offered cannot be the select's
// value either: the control opens on its placeholder with the message above it.
const get = async (request, h) => {
  const { journey, answers } = await state.get(request, h)
  const dateWindow = arrivalWindow()
  const { values, errors } = await validation.onStored(answers, { dateWindow })
  return render(h, journey, dateWindow, values, { errors })
}

const post = async (request, h) => {
  // One clock read per request: two would let the widget bounds and the server
  // bounds disagree across a midnight boundary.
  const dateWindow = arrivalWindow()
  const { values, answers, errors } = await validation.onSubmit(
    request.payload ?? {},
    { dateWindow }
  )
  if (hasErrors(errors)) {
    const { journey } = await state.get(request, h)
    return (await render(h, journey, dateWindow, values, { errors })).code(
      HTTP_STATUS_BAD_REQUEST
    )
  }

  let committed
  const { failure } = await kit.recoverableSave(
    async () => {
      committed = await state.commit(request, h, answers)
    },
    async () => {
      const { journey } = await state.get(request, h)
      return (
        await render(h, journey, dateWindow, values, {
          recoverableError: true
        })
      ).code(HTTP_STATUS_INTERNAL_SERVER_ERROR)
    }
  )
  if (failure) {
    return failure
  }

  const { scope } = committed
  return h.redirect(await kit.nextTarget(request, page, scope))
}

export const routes = kit.pageRoutes(page, { get, post })
