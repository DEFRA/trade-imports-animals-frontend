/**
 * V4 "Optional - All-or-nothing" (spec: documents). The collection itself is
 * optional — no requiredAtLeastOne, a notification can be submitted with no
 * documents — but every field inside a document item is required, so an
 * entry, once started, is incomplete until all four are answered
 * (engine/evaluate/complete.js checks every EXISTING entry regardless of
 * cardinality). Metadata only: the attachment type stands in for the file —
 * files persist by reference in a separate store (spec ruling c-004), so
 * this prototype has no upload plumbing.
 */
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
