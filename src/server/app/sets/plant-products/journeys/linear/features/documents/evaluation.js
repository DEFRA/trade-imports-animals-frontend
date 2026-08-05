import {
  feature,
  grouped
} from '../../../../../../bridge/fulfilment-bindings.js'
import {
  accompanyingDocuments,
  documentReference,
  documentType,
  filename,
  issueDate,
  uploadId
} from '../../../../obligations/index.js'

const document = {
  field: 'accompanyingDocuments',
  token: 'doc',
  obligation: accompanyingDocuments
}

const documentLeaf = (field, obligation) =>
  grouped({ field, obligation, groups: [document] })

export const evaluationBindings = feature('documents', [
  documentLeaf('documentType', documentType),
  documentLeaf('documentReference', documentReference),
  documentLeaf('issueDate', issueDate),
  documentLeaf('uploadId', uploadId),
  documentLeaf('filename', filename)
])
