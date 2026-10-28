export const UPLOAD_AWAITING_FILE = 'initiated'
export const UPLOAD_SCANNING = 'pending'

/**
 * Whether a file posted to an upload session now would still be taken.
 *
 * @param {string} uploadStatus - the status the upload service reports for the session
 * @returns {boolean} whether the session is still waiting for its file
 */
export const awaitsItsFile = (uploadStatus) =>
  uploadStatus === UPLOAD_AWAITING_FILE
