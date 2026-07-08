export const accompanyingDocumentType = {
  id: 'accompanyingDocumentType',
  required: true
}

export const accompanyingDocumentAttachmentType = {
  id: 'accompanyingDocumentAttachmentType',
  required: true
}

export const accompanyingDocumentReference = {
  id: 'accompanyingDocumentReference',
  required: true
}

export const accompanyingDocumentDateOfIssue = {
  id: 'accompanyingDocumentDateOfIssue',
  required: true
}

export const documents = {
  id: 'documents',
  collection: true,
  item: [
    accompanyingDocumentType,
    accompanyingDocumentAttachmentType,
    accompanyingDocumentReference,
    accompanyingDocumentDateOfIssue
  ]
}

export const obligations = [documents]
