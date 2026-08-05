import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as en } from '../../copy/copy.en.js'
import { copy as cy } from '../../copy/copy.cy.js'

const copy = copyFor({ en, cy })

export const SCAN_STATUS_TAGS = {
  COMPLETE: {
    text: copy.scanTags.safe,
    classes: 'govuk-tag--green',
    announcement: copy.announce.safe
  },
  REJECTED: {
    text: copy.scanTags.virusFound,
    classes: 'govuk-tag--red',
    announcement: copy.announce.virusFound
  },
  PENDING: { text: copy.scanTags.checking, classes: 'govuk-tag--blue' }
}

export const UNKNOWN_TAG = {
  text: copy.scanTags.unknown,
  classes: 'govuk-tag--grey'
}

export const scanCopyJson = JSON.stringify({
  ...SCAN_STATUS_TAGS,
  UNKNOWN: UNKNOWN_TAG
})

export const statusTagHtml = (scanStatus) => {
  const tag = SCAN_STATUS_TAGS[scanStatus] ?? UNKNOWN_TAG
  return `<strong class="govuk-tag ${tag.classes}">${tag.text}</strong>`
}
