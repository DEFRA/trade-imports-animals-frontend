import {
  getSessionValue,
  setSessionValue
} from '../../common/helpers/session-helpers.js'
import { sessionKeys } from '../../common/constants/session-keys.js'
import { cdpUploaderClient } from '../../common/clients/cdp-uploader-client.js'

// EUDPA-106 spike: landing page for the cdp-uploader 302 redirect. The
// browser lands here right after posting to /upload-and-scan/<uploadId>;
// the file bytes are already at cdp-uploader but the scan is in flight.
//
// We poll cdp-uploader's status endpoint server-side on each refresh tick
// (no client JS — meta-refresh only). Once uploadStatus === 'ready' we
// commit the doc to the yar session's documents list and bounce back to the
// accompanying-documents page so the user sees the file with a Safe tag.
//
// Metadata capture (documentType, documentReference, dateOfIssue) is punted:
// the form fields ride along in the multipart POST to /upload-and-scan but
// cdp-uploader discards them, and the no-JS constraint blocks any pre-upload
// stash. See findings.md for the follow-up ticket's design point (two-step
// flow or per-doc /initiate with metadata set before the file input renders).

const commitToDocumentsList = (request, uploadId, filename) => {
  const documents = getSessionValue(request, sessionKeys.documents) ?? []
  documents.push({
    uploadId,
    filename,
    // Trust cdp-uploader's authoritative status; the backend has no record of
    // this upload under the new architecture and would 404 the getStatus call.
    scanStatus: 'COMPLETE',
    documentType: 'ITAHC',
    documentReference: 'SPIKE-UPLOAD',
    dateOfIssue: new Date().toISOString().slice(0, 10)
  })
  setSessionValue(request, sessionKeys.documents, documents)
  setSessionValue(request, sessionKeys.currentUpload, null)
}

const getAttempt = (request) => {
  const parsed = Number.parseInt(request.query.attempt ?? '0', 10)
  return Number.isNaN(parsed) ? 0 : parsed
}

export const uploadSuccessfulHandler = async (request, h) => {
  const currentUpload = getSessionValue(request, sessionKeys.currentUpload)
  if (!currentUpload) {
    return h.redirect('/accompanying-documents')
  }

  let status
  try {
    status = await cdpUploaderClient.getStatus(currentUpload.statusUrl)
  } catch (err) {
    request.logger.warn(
      `cdp-uploader /status poll failed: ${err.message} — retrying via meta-refresh`
    )
    return h.view('accompanying-documents/upload-successful', {
      pageTitle: 'Uploading your file',
      nextAttempt: getAttempt(request) + 1
    })
  }

  if (status.uploadStatus === 'ready') {
    // cdp-uploader captures the multipart form fields in status.form.file —
    // grab the filename so it renders in the documents list.
    const filename = status.form?.file?.filename ?? 'upload'
    commitToDocumentsList(request, currentUpload.uploadId, filename)
    return h.redirect('/accompanying-documents')
  }

  return h.view('accompanying-documents/upload-successful', {
    pageTitle: 'Uploading your file',
    nextAttempt: getAttempt(request) + 1
  })
}
