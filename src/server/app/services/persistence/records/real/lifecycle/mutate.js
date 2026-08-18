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
  // opaque fulfilments payload. concurrencyToken rides through from the hydrated
  // `known` so the backend can reject stale writes with 409 STALE_CONCURRENCY_TOKEN.
  const body = {
    referenceNumber: journeyId,
    concurrencyToken: known?.concurrencyToken,
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
