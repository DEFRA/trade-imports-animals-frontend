import { encodeEvaluatorFulfilments } from '../../fulfilment-codec/index.js'
import { marshal } from '../marshal/document.js'
import { loadWritable } from '../store/writable.js'
import { copiesBySourceAndKey, journeys } from '../store/state.js'
import {
  advanceConcurrencyToken,
  assertConcurrencyToken
} from '../store/concurrency.js'

export const replaceFulfilment = async (
  journeyId,
  fulfilment,
  { known } = {}
) => {
  const journey = loadWritable(journeyId)
  // Only a present token is checked: a save that carries none stays permissive.
  if (known?.concurrencyToken != null) {
    assertConcurrencyToken(journey, known.concurrencyToken, 'save notification')
  }
  journey.fulfilment = structuredClone(
    encodeEvaluatorFulfilments(fulfilment ?? {})
  )
  advanceConcurrencyToken(journey)
  return structuredClone(marshal(journey))
}

export const clear = async () => {
  journeys().clear()
  copiesBySourceAndKey().clear()
}
