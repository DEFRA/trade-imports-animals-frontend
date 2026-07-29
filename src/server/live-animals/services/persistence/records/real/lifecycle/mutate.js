import { encodeEvaluatorFulfilments } from '../../fulfilment-codec/index.js'
import {
  answersToTargetNotification,
  fulfilmentToNotification
} from '../../mapper.js'
import {
  fulfilmentsUrl,
  notificationsUrl,
  proposedNotificationsUrl
} from '../config.js'
import { put } from '../http/put.js'
import { marshal } from '../marshal/document.js'
import { throwProjectionFailure } from '../projections/failure.js'
import { putProjection } from '../projections/put-projection.js'
import { assertWritable } from '../write-guards/assert-writable.js'
import { resolveStatus } from '../write-guards/resolve-status.js'

const saveProjections = async (journeyId, owner, projections) => {
  const failures = []
  for (const projection of projections) {
    try {
      await putProjection({ journeyId, owner, ...projection })
    } catch (error) {
      failures.push({ name: projection.name, error })
    }
  }
  return failures
}

export const replaceFulfilment = async (
  journeyId,
  fulfilment,
  { known, owner } = {}
) => {
  const status = await resolveStatus(journeyId, known, owner)
  assertWritable(journeyId, status)

  const snapshot = structuredClone(fulfilment ?? {})
  const canonicalDocument = {
    id: journeyId,
    fulfilment: encodeEvaluatorFulfilments(snapshot)
  }
  const projections = [
    {
      name: 'current notification',
      url: `${notificationsUrl}/${journeyId}`,
      body: fulfilmentToNotification(snapshot, journeyId)
    },
    {
      name: 'proposed notification',
      url: `${proposedNotificationsUrl}/${journeyId}`,
      body: answersToTargetNotification(snapshot, journeyId)
    }
  ]

  const canonicalResponse = await put(
    `${fulfilmentsUrl}/${journeyId}`,
    canonicalDocument,
    'save fulfilment',
    owner
  )
  const saved = await canonicalResponse.json()

  const failures = await saveProjections(journeyId, owner, projections)
  if (failures.length > 0) {
    throwProjectionFailure(journeyId, failures)
  }

  return marshal(saved, owner?.sub ?? null)
}

export const clear = async () => {}
