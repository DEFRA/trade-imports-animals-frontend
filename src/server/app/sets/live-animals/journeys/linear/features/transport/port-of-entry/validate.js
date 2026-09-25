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

const portMessage = (stored) =>
  stored ? copy.errors.portNoLongerAvailable : undefined

const arrivalDateRangeMessage = (stored, dateWindow) =>
  stored
    ? copy.errors.arrivalDateNoLongerInWindow
    : copy.errors.arrivalDateOutOfRange(dateWindow.minText, dateWindow.maxText)

// The page hands in the window it drew the date widget with — two clock
// reads in one request would let widget bounds and server bounds disagree
// across midnight. A reading with no widget takes the window as it stands.
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
  toAnswers: (values) => ({
    ...values,
    arrivalDateAtPort: readDate(values, 'arrivalDateAtPort')
  })
})
