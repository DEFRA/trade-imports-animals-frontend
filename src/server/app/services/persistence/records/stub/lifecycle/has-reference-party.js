import { projectAnswers } from '../../../../../bridge/fulfilments/index.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'

// Mirrors the real backend: ConsignmentPartyResolver resolves parties whose
// storage carries an addressId, and it needs actor.organisationId to do so.
// placeOfOrigin and contactAddress are inline — their addressId is stripped at
// backend ingest, so no resolve fires. The four reference roles below are the
// ones the backend actually looks up.
const REFERENCE_PARTY_KEYS = [
  'consignor',
  'consignee',
  'importer',
  'placeOfDestination'
]

export const hasReferenceParty = (fulfilment) => {
  const answers = projectAnswers(decodePersistedFulfilment(fulfilment))
  return REFERENCE_PARTY_KEYS.some((key) => answers[key]?.addressId != null)
}
