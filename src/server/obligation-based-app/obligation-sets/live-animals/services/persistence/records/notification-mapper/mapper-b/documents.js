import {
  accompanyingDocumentAttachmentType,
  accompanyingDocumentDateOfIssue,
  accompanyingDocumentReference,
  accompanyingDocumentType,
  documentFilename,
  documentUploadId,
  documents
} from '../../../../../model/obligations/obligations.js'
import { compact } from '../shared/compact.js'

const documentObligations = [
  accompanyingDocumentType,
  accompanyingDocumentAttachmentType,
  accompanyingDocumentReference,
  accompanyingDocumentDateOfIssue
]
const documentInstanceObligations = [
  ...documentObligations,
  documentUploadId,
  documentFilename
]

export const targetDocumentsFromFulfilment = (reader) => {
  const recordsByObligation = new Map(
    documentObligations.map((obligation) => [
      obligation,
      reader.records(obligation)
    ])
  )
  const valueAt = (obligation, id) => recordsByObligation.get(obligation)[id]
  // Upload metadata establishes the canonical document record but is not
  // projected into Mapper B's proposed-notification document shape.
  const ids = reader.instanceIds(documents, documentInstanceObligations)
  if (ids.length === 0) return undefined
  return ids.map((id) =>
    compact({
      documentType: valueAt(accompanyingDocumentType, id),
      attachmentType: valueAt(accompanyingDocumentAttachmentType, id),
      reference: valueAt(accompanyingDocumentReference, id),
      dateOfIssue: valueAt(accompanyingDocumentDateOfIssue, id)
    })
  )
}
