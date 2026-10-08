import { encodeEvaluatorFulfilments } from '../../fulfilment-codec/index.js'
import { marshal } from '../marshal/document.js'
import { loadWritable } from '../store/writable.js'
import { copiesBySourceAndKey, journeys } from '../store/state.js'
import { advanceConcurrencyToken } from '../store/concurrency.js'

export const replaceFulfilment = async (journeyId, fulfilment) => {
  const journey = loadWritable(journeyId)
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
