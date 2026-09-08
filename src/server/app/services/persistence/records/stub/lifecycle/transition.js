import {
  AMEND,
  DELETED,
  DRAFT,
  SUBMITTED
} from '../../../../../engine/persistence/records.js'
import { journeys } from '../store/state.js'
import { loadWritable } from '../store/writable.js'
import { marshal } from '../marshal/document.js'
import { hasReferenceParty } from './has-reference-party.js'

const requireActorForReferenceParties = (journey, actor) => {
  if (!hasReferenceParty(journey.fulfilment)) {
    return
  }
  if (!actor?.organisationId) {
    throw new Error('organisation id is required')
  }
}

export const finalise = async (journeyId, _actor) => {
  const journey = loadWritable(journeyId)
  journey.status = SUBMITTED
  journey.submittedAt = new Date().toISOString()
  delete journey.submittedSnapshot
  return structuredClone(marshal(journey))
}

export const amend = async (journeyId, _actor) => {
  const journey = journeys.get(journeyId)
  if (!journey) {
    throw new Error(`Unknown journey "${journeyId}"`)
  }
  if (journey.status !== SUBMITTED) {
    throw new Error(`Journey "${journeyId}" is not submitted — cannot amend`)
  }
  journey.submittedSnapshot = {
    fulfilment: structuredClone(journey.fulfilment),
    submittedAt: journey.submittedAt
  }
  journey.status = AMEND
  journey.submittedAt = null
  return structuredClone(marshal(journey))
}

export const cancelAmend = async (journeyId, actor) => {
  const journey = journeys.get(journeyId)
  if (!journey) {
    throw new Error(`Unknown journey "${journeyId}"`)
  }
  if (journey.status !== AMEND || journey.submittedSnapshot == null) {
    throw new Error(
      `Journey "${journeyId}" has no amendment snapshot — cannot cancel amendment`
    )
  }
  // Cancel-amend emits from the RESTORED submitted baseline, so the check runs
  // against the snapshot, not the current working copy. A party picked during
  // the amendment reverts on cancel and must not fake a "no parties" pass.
  requireActorForReferenceParties(
    { fulfilment: journey.submittedSnapshot.fulfilment },
    actor
  )
  journey.fulfilment = structuredClone(journey.submittedSnapshot.fulfilment)
  journey.submittedAt = journey.submittedSnapshot.submittedAt
  journey.status = SUBMITTED
  delete journey.submittedSnapshot
  return structuredClone(marshal(journey))
}

export const softDelete = async (journeyId, actor) => {
  const journey = journeys.get(journeyId)
  if (!journey) {
    throw new Error(`Unknown journey "${journeyId}"`)
  }
  if (
    journey.status !== DRAFT &&
    journey.status !== SUBMITTED &&
    journey.status !== AMEND &&
    journey.status !== DELETED
  ) {
    throw new Error(
      `Journey "${journeyId}" is ${journey.status} — cannot delete`
    )
  }
  // Draft deletes emit a draft-grade event (best-effort resolution, no actor
  // needed). Deleting a submitted or in-flight amendment does need the actor
  // because the emitted event carries the resolved parties.
  if (journey.status === SUBMITTED || journey.status === AMEND) {
    requireActorForReferenceParties(journey, actor)
  }
  journey.status = DELETED
  journey.submittedAt = null
  return structuredClone(marshal(journey))
}
