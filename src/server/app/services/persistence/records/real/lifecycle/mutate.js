import { encodeEvaluatorFulfilments } from '../../fulfilment-codec/index.js'
import { fulfilmentToNotification } from '../../mapper.js'
import { notificationsUrl } from '../config.js'
import { put } from '../http/put.js'
import { marshal } from '../marshal/document.js'
import { assertWritable } from '../write-guards/assert-writable.js'
import { resolveStatus } from '../write-guards/resolve-status.js'

export const replaceFulfilment = async (
  journeyId,
  fulfilment,
  { known } = {}
) => {
  const status = await resolveStatus(journeyId, known)
  assertWritable(journeyId, status)

  const snapshot = structuredClone(fulfilment ?? {})
  // Under the merged aggregate (EUDPA-323), PUT /notifications/{ref} carries both
  // the notification-shape fields (via the mapper) AND the opaque fulfilments
  // payload in a single request. Backend writes both atomically and fires the
  // outbox event from the merged aggregate.
  const body = {
    referenceNumber: journeyId,
    ...fulfilmentToNotification(snapshot, journeyId),
    fulfilments: encodeEvaluatorFulfilments(snapshot)
  }

  const response = await put(
    `${notificationsUrl}/${journeyId}`,
    body,
    'save notification'
  )
  return marshal(await response.json())
}

export const clear = async () => {}
