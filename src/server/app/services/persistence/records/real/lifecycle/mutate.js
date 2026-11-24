import { encodeEvaluatorFulfilments } from '../../fulfilment-codec/index.js'
import { fulfilmentToNotification } from '../../mapper.js'
import { notificationsUrl } from '../config.js'
import { send } from '../http/send.js'
import { marshal } from '../marshal/document.js'
import { assertWritable } from '../write-guards/assert-writable.js'
import { resolveStatus } from '../write-guards/resolve-status.js'

export const replaceFulfilment = async (
  journeyId,
  fulfilment,
  { known, actor } = {}
) => {
  const status = await resolveStatus(journeyId, known)
  assertWritable(journeyId, status)

  const snapshot = structuredClone(fulfilment ?? {})
  const body = {
    notification: {
      referenceNumber: journeyId,
      concurrencyToken: known?.concurrencyToken,
      ...fulfilmentToNotification(snapshot, journeyId),
      fulfilments: encodeEvaluatorFulfilments(snapshot)
    },
    ...(actor ? { actor } : {})
  }

  const response = await send(
    'replace-notification',
    `${notificationsUrl}/${journeyId}`,
    { method: 'PUT', body },
    { journeyId }
  )
  return marshal(await response.json())
}

export const clear = async () => {}
