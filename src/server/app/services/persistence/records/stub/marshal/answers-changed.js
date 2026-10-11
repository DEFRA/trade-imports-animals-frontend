import { isDeepStrictEqual } from 'node:util'
import { AMEND } from '../../../../../engine/persistence/records.js'
import { fulfilmentToNotification } from '../../mapper.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'

/** The notification answers as the backend would receive them. */
const notificationAnswers = (stored, id) =>
  JSON.parse(
    JSON.stringify(
      fulfilmentToNotification(decodePersistedFulfilment(stored), id)
    )
  )

/** Whether an amendment's notification answers differ from the submitted ones.
 * Only notification answers count, as in the backend: documents never do. */
export const answersChangedSinceSubmission = (document) => {
  if (document.status !== AMEND || document.submittedSnapshot == null) {
    return false
  }
  return !isDeepStrictEqual(
    notificationAnswers(document.fulfilment, document.id),
    notificationAnswers(document.submittedSnapshot.fulfilment, document.id)
  )
}
