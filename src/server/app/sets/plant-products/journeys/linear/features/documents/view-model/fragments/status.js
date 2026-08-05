import { copyFor } from '../../../../../../../../shared/copy.js'
import { copy as cy } from '../../copy/copy.cy.js'
import { copy as en } from '../../copy/copy.en.js'
import { SCAN_STATUS } from '../../scan-poll.js'

const copy = copyFor({ en, cy })

// A row with no file has no virus-scan verdict to show, so it renders as an
// absence rather than as any kind of scan result.
export const NO_FILE_STATE = { text: copy.status.noFile, tag: false }

export const UNAVAILABLE_STATE = {
  text: copy.status.unavailable,
  classes: 'govuk-tag--grey',
  tag: true
}

export const SCAN_STATUS_TAGS = {
  [SCAN_STATUS.PENDING]: {
    text: copy.status.checking,
    classes: 'govuk-tag--blue',
    tag: true
  },
  [SCAN_STATUS.COMPLETE]: {
    text: copy.status.safe,
    classes: 'govuk-tag--green',
    tag: true
  },
  [SCAN_STATUS.REJECTED]: {
    text: copy.status.virus,
    classes: 'govuk-tag--red',
    tag: true
  },
  [SCAN_STATUS.UNAVAILABLE]: UNAVAILABLE_STATE,
  [SCAN_STATUS.NO_FILE]: NO_FILE_STATE
}

export const statusState = (scanStatus) =>
  SCAN_STATUS_TAGS[scanStatus] ?? UNAVAILABLE_STATE
