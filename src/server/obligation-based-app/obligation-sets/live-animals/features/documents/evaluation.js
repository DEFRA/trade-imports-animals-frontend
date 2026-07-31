import { feature, grouped } from '../../bridge/fulfilment-bindings.js'
import {
  accompanyingDocumentAttachmentType,
  accompanyingDocumentDateOfIssue,
  accompanyingDocumentReference,
  accompanyingDocumentType,
  documentFilename,
  documents,
  documentUploadId
} from '../../model/obligations/obligations.js'

const document = {
  field: 'documents',
  token: 'line',
  obligation: documents
}

const documentLeaf = (field, obligation) =>
  grouped({ field, obligation, groups: [document] })

export const evaluationBindings = feature('documents', [
  documentLeaf('accompanyingDocumentType', accompanyingDocumentType),
  documentLeaf(
    'accompanyingDocumentAttachmentType',
    accompanyingDocumentAttachmentType
  ),
  documentLeaf('accompanyingDocumentReference', accompanyingDocumentReference),
  documentLeaf(
    'accompanyingDocumentDateOfIssue',
    accompanyingDocumentDateOfIssue
  ),
  documentLeaf('uploadId', documentUploadId),
  documentLeaf('filename', documentFilename)
])
