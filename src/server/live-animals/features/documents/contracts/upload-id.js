import * as state from '../../../engine/index.js'

// The upload id is a path segment, so it is constrained before it reaches
// the service — no traversal, no encoded separators.
export const UPLOAD_ID_PATTERN = /^[a-zA-Z0-9-]+$/

export const ownsUpload = (answers, evaluation, uploadId) =>
  state
    .collectionView(answers, ['documents'], evaluation)
    .some(({ entry }) => entry.uploadId === uploadId)
