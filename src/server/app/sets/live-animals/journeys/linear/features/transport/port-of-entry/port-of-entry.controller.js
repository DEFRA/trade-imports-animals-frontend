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
import { meansOfTransportLabel } from '../means-of-transport-label.js'
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
  { value: '', text: copy.port.selectText },
  ...(await ports.portOptions()).map((option) => ({
    ...option,
    selected: option.value === selected
  }))
]

const meansItems = (selected) => [
  { value: '', text: copy.means.selectText },
  ...transportReference.meansOfTransport().map((code) => ({
    value: code,
    text: meansOfTransportLabel(code),
    selected: code === selected
  }))
]

const render = async (
  request,
  h,
  current,
  dateWindow,
  values,
  { errors = {}, recoverableError = false } = {}
) => {
  const questionLabelClasses = 'govuk-label--m'
  return h.view(view, {
    ...kit.base(copy.title, {
      request,
      backLink: await kit.runBackLink(request, page.id, current),
      journey: current.journey,
      page,
      recoverableError
    }),
    copy,
    questionLabelClasses,
    values,
    errors,
    errorSummary: kit.errorSummary(errors),
    portItems: await portItems(values.portOfEntry),
    meansItems: meansItems(values.meansOfTransport),
    arrivalDate: kit.dateField('arrivalDateAtPort', {
      label: copy.arrivalDate.label,
      hint: copy.arrivalDate.hint,
      labelClasses: questionLabelClasses,
      value: values.arrivalDateAtPort ?? {},
      error: errors.arrivalDateAtPort,
      minDate: dateWindow.minText,
      maxDate: dateWindow.maxText
    })
  })
}

const get = async (request, h) => {
  const current = await state.get(request, h)
  const dateWindow = arrivalWindow()
  const { values, errors } = await validation.onStored(current.answers, {
    dateWindow
  })
  return render(request, h, current, dateWindow, values, { errors })
}

const post = async (request, h) => {
  const dateWindow = arrivalWindow()
  const { values, answers, errors } = await validation.onSubmit(
    request.payload ?? {},
    { dateWindow }
  )
  if (hasErrors(errors)) {
    const current = await state.get(request, h)
    return (
      await render(request, h, current, dateWindow, values, { errors })
    ).code(HTTP_STATUS_BAD_REQUEST)
  }

  const { value: committed, failure } = await kit.recoverableSave(
    request,
    () => state.commit(request, h, answers),
    async () => {
      const current = await state.get(request, h)
      return (
        await render(request, h, current, dateWindow, values, {
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
