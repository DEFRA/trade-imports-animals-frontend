import {
  compose,
  dateTextInRange,
  maxText,
  oneOf,
  pageValidation
} from '../../../../../../../lib/validate/index.js'
import { dateTextOf, readDate } from '../../../../../../../shared/kit.js'
import { copyFor } from '../../../../../../../shared/copy.js'
import * as ports from '../../../../../../../services/ports/index.js'
import * as transportReference from '../../../../../../../services/transport-reference/index.js'
import { copy as en } from '../copy/copy.en.js'
import { copy as cy } from '../copy/copy.cy.js'
import { arrivalWindow } from './arrival-window.js'

const copy = copyFor({ en, cy }).portOfEntry

const TRANSPORT_FIELD_MAX_LENGTH = 58

// A port that has closed, and an arrival date the window has moved past, are
// not mistakes the trader made: both were good when they answered. The rule
// broken is the same one either way, so only what it says about the answer
// changes.
const portMessage = (stored) =>
  stored ? copy.errors.portNoLongerAvailable : undefined

const arrivalDateRangeMessage = (stored, dateWindow) =>
  stored
    ? copy.errors.arrivalDateNoLongerInWindow
    : copy.errors.arrivalDateOutOfRange(dateWindow.minText, dateWindow.maxText)

// The window moves with the clock, so the rules are built per reading rather
// than once at import. The page hands in the window it drew the date widget
// with — two clock reads in one request would let the widget bounds and the
// server bounds disagree across a midnight boundary. A reading that draws no
// widget takes the window as it stands.
const fields = async (
  _values,
  { dateWindow = arrivalWindow(), stored } = {}
) => {
  const portCodes = (await ports.list()).map((port) => port.code)
  return compose(
    dateTextInRange('arrivalDateAtPort', {
      min: dateWindow.min,
      max: dateWindow.max,
      invalidMessage: copy.errors.arrivalDateInvalid,
      rangeMessage: arrivalDateRangeMessage(stored, dateWindow)
    }),
    oneOf('portOfEntry', portCodes, portMessage(stored)),
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
}

export const validation = pageValidation({
  fields,
  fromPayload: (payload) => ({
    arrivalDateAtPort: String(payload.arrivalDateAtPort ?? '').trim(),
    portOfEntry: payload.portOfEntry ?? '',
    meansOfTransport: payload.meansOfTransport ?? '',
    transportIdentification: (payload.transportIdentification ?? '').trim(),
    transportDocumentReference: (
      payload.transportDocumentReference ?? ''
    ).trim()
  }),
  fromAnswers: (answers) => ({
    arrivalDateAtPort: dateTextOf(answers.arrivalDateAtPort),
    portOfEntry: answers.portOfEntry ?? '',
    meansOfTransport: answers.meansOfTransport ?? '',
    transportIdentification: answers.transportIdentification ?? '',
    transportDocumentReference: answers.transportDocumentReference ?? ''
  }),
  // The date goes in as the three parts the answer is stored in; every other
  // field is stored exactly as the form holds it.
  toAnswers: (values) => ({
    ...values,
    arrivalDateAtPort: readDate(values, 'arrivalDateAtPort')
  })
})
