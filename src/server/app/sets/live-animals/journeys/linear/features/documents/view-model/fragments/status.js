import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { escapeHtml } from './text.js'

const copy = copyFor({ en, cy })

export const SCAN_STATUS_TAGS = {
  COMPLETE: {
    text: copy.scanTags.complete,
    classes: 'govuk-tag--green',
    announcement: copy.announce.safe
  },
  REJECTED: {
    text: copy.scanTags.virusFound,
    classes: 'govuk-tag--red',
    announcement: copy.announce.virusFound
  },
  PENDING: { text: copy.scanTags.scanning, classes: 'govuk-tag--blue' }
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
export const statusTagHtml = (scanStatus, reference) => {
  const tag = SCAN_STATUS_TAGS[scanStatus] ?? UNKNOWN_TAG
  return (
    `<span class="govuk-visually-hidden">${escapeHtml(copy.scanStatusHidden(reference))}</span>` +
    `<strong class="govuk-tag ${tag.classes}">${tag.text}</strong>`
  )
}
