import {
  AMEND,
  DELETED,
  DRAFT,
  isSubmittedStatus
} from '../../../../../engine/persistence/records.js'
import { submittedStatusFor } from './submitted-status.js'
import { journeys } from '../store/state.js'
import { loadWritable } from '../store/writable.js'
import { marshal } from '../marshal/document.js'
import {
  advanceConcurrencyToken,
  assertConcurrencyToken
} from '../store/concurrency.js'

export const finalise = async (journeyId, _actor, concurrencyToken) => {
  const journey = loadWritable(journeyId)
  assertConcurrencyToken(journey, concurrencyToken, 'submit notification')
  advanceConcurrencyToken(journey)
  journey.status = submittedStatusFor(journey.fulfilment)
  journey.submittedAt = new Date().toISOString()
  delete journey.submittedSnapshot
  return structuredClone(marshal(journey))
}

export const amend = async (journeyId, _actor) => {
  const journey = journeys().get(journeyId)
  if (!journey) {
    throw new Error(`Unknown journey "${journeyId}"`)
  }
  if (!isSubmittedStatus(journey.status)) {
    throw new Error(`Journey "${journeyId}" is not submitted — cannot amend`)
  }
  journey.submittedSnapshot = {
    status: journey.status,
    fulfilment: structuredClone(journey.fulfilment),
    submittedAt: journey.submittedAt
  }
  advanceConcurrencyToken(journey)
  journey.status = AMEND
  journey.submittedAt = null
  return structuredClone(marshal(journey))
}

export const cancelAmend = async (journeyId, _actor) => {
  const journey = journeys().get(journeyId)
  if (!journey) {
    throw new Error(`Unknown journey "${journeyId}"`)
  }
  if (journey.status !== AMEND || journey.submittedSnapshot == null) {
    throw new Error(
      `Journey "${journeyId}" has no amendment snapshot — cannot cancel amendment`
    )
  }
  journey.fulfilment = structuredClone(journey.submittedSnapshot.fulfilment)
  journey.submittedAt = journey.submittedSnapshot.submittedAt
  advanceConcurrencyToken(journey)
  journey.status = journey.submittedSnapshot.status
  delete journey.submittedSnapshot
  return structuredClone(marshal(journey))
}

export const softDelete = async (journeyId, _actor) => {
  const journey = journeys().get(journeyId)
  if (!journey) {
    throw new Error(`Unknown journey "${journeyId}"`)
  }
  if (
    journey.status !== DRAFT &&
    !isSubmittedStatus(journey.status) &&
    journey.status !== AMEND &&
    journey.status !== DELETED
  ) {
    throw new Error(
      `Journey "${journeyId}" is ${journey.status} — cannot delete`
    )
  }
  advanceConcurrencyToken(journey)
  journey.status = DELETED
  journey.submittedAt = null
  return structuredClone(marshal(journey))
}
