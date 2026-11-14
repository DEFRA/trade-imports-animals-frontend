import {
  SUBMITTED,
  SUBMITTED_ACTION_REQUIRED
} from '../../../../../engine/persistence/records.js'
import { projectAnswers } from '../../../../../bridge/fulfilments/index.js'
import { decodePersistedFulfilment } from '../../fulfilment-codec/index.js'

export const submittedStatusFor = (persistedFulfilment) => {
  const { documents } = projectAnswers(
    decodePersistedFulfilment(persistedFulfilment)
  )
  const itahcUploaded = (documents ?? []).some(
    (document) => document.accompanyingDocumentType === 'ITAHC'
  )
  return itahcUploaded ? SUBMITTED : SUBMITTED_ACTION_REQUIRED
}
