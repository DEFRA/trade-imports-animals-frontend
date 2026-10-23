import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { escapeHtml } from './text.js'

const copy = copyFor({ en, cy })

const REFUSED_TAG_CLASSES = 'govuk-tag--red'

export const SCAN_STATUS_TAGS = {
  COMPLETE: {
    text: copy.scanTags.complete,
    classes: 'govuk-tag--green',
    announcement: copy.announce.safe
  },
  REJECTED: {
    text: copy.scanTags.rejected,
    classes: REFUSED_TAG_CLASSES,
    announcement: copy.announce.rejected
  },
  REJECTED_FILE_VIRUS: {
    text: copy.scanTags.virusFound,
    classes: REFUSED_TAG_CLASSES,
    announcement: copy.announce.virusFound
  },
  REJECTED_FILE_UPLOAD_FAILED: {
    text: copy.scanTags.uploadFailed,
    classes: REFUSED_TAG_CLASSES,
    announcement: copy.announce.uploadFailed
  },
  REJECTED_FILE_DOWNLOAD_FAILED: {
    text: copy.scanTags.downloadFailed,
    classes: REFUSED_TAG_CLASSES,
    announcement: copy.announce.downloadFailed
  },
  PENDING: { text: copy.scanTags.scanning, classes: 'govuk-tag--blue' }
}

/**
 * Which tag a settled document shows: the one written for the reason it was refused for, or the
 * plain refusal when the upload service gave a reason this page has no wording for.
 *
 * @param {object} document - a document carrying its scan status and, when refused, the reason
 * @returns {string} the key into `SCAN_STATUS_TAGS`
 */
export const tagKeyFor = ({ scanStatus, rejectionReason }) => {
  const perReason = `${scanStatus}_${rejectionReason}`
  return SCAN_STATUS_TAGS[perReason] ? perReason : scanStatus
}

export const UNKNOWN_TAG = {
  text: copy.scanTags.unknown,
  classes: 'govuk-tag--grey'
}

export const scanCopyJson = JSON.stringify({
  ...SCAN_STATUS_TAGS,
  UNKNOWN: UNKNOWN_TAG
})

// The hidden label sits outside the tag the client rewrites in place, so it
// survives a polled status change and names the document for every state.
export const statusTagHtml = (tagKey, reference) => {
  const tag = SCAN_STATUS_TAGS[tagKey] ?? UNKNOWN_TAG
  return (
    `<span class="govuk-visually-hidden">${escapeHtml(copy.scanStatusHidden(reference))}</span>` +
    `<strong class="govuk-tag ${tag.classes}">${tag.text}</strong>`
  )
}
