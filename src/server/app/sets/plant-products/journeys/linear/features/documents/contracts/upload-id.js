import * as state from '../../../../../../../engine/index.js'
import { documentUploads } from '../../../../../services/document-uploads/index.js'

// The upload id becomes a path segment, so it is constrained before it reaches
// the service — no traversal, no separators, no encoded separators.
export const UPLOAD_ID_PATTERN = /^[a-zA-Z0-9-]+$/

export const isSafeUploadId = (uploadId) =>
  typeof uploadId === 'string' && UPLOAD_ID_PATTERN.test(uploadId)

// Journey state is not proof of ownership on the retry path: a forged hidden
// field can be planted into the submitted state before it is read back. Only
// the backend knows which notification a session belongs to.
export const isOwnedByJourney = async (uploadId, journeyId) => {
  if (!isSafeUploadId(uploadId)) return false
  try {
    return (await documentUploads.ownerOf(uploadId)) === journeyId
  } catch {
    return false
  }
}

// Reading a file back is answered from the CURRENT journey's own rows: an id
// this journey does not hold is simply absent, so a well-formed id belonging to
// another journey in the same session finds nothing.
export const ownedDocument = (answers, evaluation, uploadId) =>
  state
    .collectionView(answers, ['accompanyingDocuments'], evaluation)
    .find(({ entry }) => entry.uploadId === uploadId)
