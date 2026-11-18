import { AMEND } from '../../../../../engine/persistence/records.js'
import {
  decodePersistedFulfilment,
  encodeEvaluatorFulfilments
} from '../../fulfilment-codec/index.js'
import { fulfilmentToNotification } from '../../mapper.js'
import { marshal } from '../marshal/document.js'
import { loadWritable } from '../store/writable.js'
import { copiesBySourceAndKey, journeys } from '../store/state.js'
import {
  advanceConcurrencyToken,
  assertConcurrencyToken
} from '../store/concurrency.js'

const notificationJsonOf = (persistedFulfilment, journeyId) =>
  JSON.stringify(
    fulfilmentToNotification(
      decodePersistedFulfilment(persistedFulfilment),
      journeyId
    )
  )

const answersDifferFromSubmitted = (journey) => {
  if (journey.status !== AMEND || journey.submittedSnapshot == null) {
    return false
  }
  return (
    notificationJsonOf(journey.fulfilment, journey.id) !==
    notificationJsonOf(journey.submittedSnapshot.fulfilment, journey.id)
  )
}

export const replaceFulfilment = async (
  journeyId,
  fulfilment,
  { known } = {}
) => {
  const journey = loadWritable(journeyId)
  if (known?.concurrencyToken != null) {
    assertConcurrencyToken(
      journey,
      known.concurrencyToken,
      'replace-notification'
    )
  }
  journey.fulfilment = structuredClone(
    encodeEvaluatorFulfilments(fulfilment ?? {})
  )
  journey.answersDifferFromSubmitted = answersDifferFromSubmitted(journey)
  advanceConcurrencyToken(journey)
  return structuredClone(marshal(journey))
}

export const clear = async () => {
  journeys().clear()
  copiesBySourceAndKey().clear()
}
