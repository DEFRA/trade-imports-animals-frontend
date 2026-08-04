import { encodeEvaluatorFulfilments } from '../../fulfilment-codec/index.js'
import { fulfilmentToNotification } from '../../mapper.js'
import { notificationFulfilmentsUrl, notificationsUrl } from '../config.js'
import { put } from '../http/put.js'
import { marshal } from '../marshal/document.js'
import { throwProjectionFailure } from '../projections/failure.js'
import { putProjection } from '../projections/put-projection.js'
import { assertWritable } from '../write-guards/assert-writable.js'
import { resolveStatus } from '../write-guards/resolve-status.js'

const saveProjections = async (journeyId, projections) => {
  const failures = []
  for (const projection of projections) {
    try {
      await putProjection({ journeyId, ...projection })
    } catch (error) {
      failures.push({ name: projection.name, error })
    }
  }
  return failures
}

export const replaceFulfilment = async (
  journeyId,
  fulfilment,
  { known } = {}
) => {
  const status = await resolveStatus(journeyId, known)
  assertWritable(journeyId, status)

  const snapshot = structuredClone(fulfilment ?? {})
  const canonicalDocument = {
    id: journeyId,
    fulfilments: encodeEvaluatorFulfilments(snapshot)
  }
  const projections = [
    {
      name: 'current notification',
      url: notificationsUrl,
      method: 'POST',
      body: {
        referenceNumber: journeyId,
        ...fulfilmentToNotification(snapshot, journeyId)
      }
    }
  ]

  const canonicalResponse = await put(
    `${notificationFulfilmentsUrl}/${journeyId}`,
    canonicalDocument,
    'save notification-fulfilments'
  )
  const saved = await canonicalResponse.json()

  const failures = await saveProjections(journeyId, projections)
  if (failures.length > 0) {
    throwProjectionFailure(journeyId, failures)
  }

  return marshal(saved)
}

export const clear = async () => {}
