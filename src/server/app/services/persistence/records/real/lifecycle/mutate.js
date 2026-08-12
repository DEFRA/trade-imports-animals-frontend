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
  // Body carries both the notification-shape fields (via the mapper) and the
  // opaque fulfilments payload; the backend writes them atomically. No outbox
  // event is emitted on this save — only on lifecycle transitions
  // (submit / amend / cancel-amend).
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
