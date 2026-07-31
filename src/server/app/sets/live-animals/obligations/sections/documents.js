// -----------------------------------------------------------------------------
// Accompanying Documents — user-driven indexed group (0..10 documents
// per notification).
//
// Spec source: traders can attach between 0 and 10 accompanying
// documents to a notification; each document carries its own type /
// attachment / reference / date-of-issue. Confluence page 6497338582
// still reads as if there is at most one document — the model is the
// source of truth until the page is amended.
//
// Per-document mandatoriness is expressed at the field level
// (`status: 'mandatory'` within the group). `requires.maxEntries: 10`
// caps the collection; the documents feature also caps the Add
// affordance but the invariant is authoritative for after-the-fact
// defence (e.g. a redeploy lowering the cap after the user saved
// records over the new limit).
// -----------------------------------------------------------------------------

export const documents = {
  id: '52210b3b-4c53-4b81-8ef0-fa0b1223e40c',
  name: 'documents',
  // No applyTo — top-level user-driven indexed group, always in scope.
  // Instance ids are session-scoped counter values (`doc1`, `doc2`, …).
  requires: {
    maxEntries: 10,
    maxEntriesErrorCode: 'obligation.accompanyingDocument.tooMany'
  }
}

export const accompanyingDocumentType = {
  id: '4fdce1f7-0819-4d3d-8abc-b67d8f9fa0c8',
  name: 'accompanyingDocumentType',
  within: documents,
  status: 'mandatory'
}

export const accompanyingDocumentAttachmentType = {
  id: '50ede208-1920-4e4e-8bcd-c78e9f0fb1d9',
  name: 'accompanyingDocumentAttachmentType',
  within: documents,
  status: 'mandatory'
}

export const accompanyingDocumentReference = {
  id: '51fef319-2a31-4f5f-8cde-d89fa010c2ea',
  name: 'accompanyingDocumentReference',
  within: documents,
  status: 'mandatory'
}

export const accompanyingDocumentDateOfIssue = {
  id: '5210042a-3b42-4a70-8def-e9a0b121d3fb',
  name: 'accompanyingDocumentDateOfIssue',
  within: documents,
  status: 'mandatory'
}

export const documentUploadId = {
  id: '59dc2402-3805-4af3-9690-2b9628a59e83',
  name: 'uploadId',
  within: documents,
  status: 'optional'
}

export const documentFilename = {
  id: '74dc1adc-b2d4-4a66-bf75-3af127810264',
  name: 'filename',
  within: documents,
  status: 'optional'
}
