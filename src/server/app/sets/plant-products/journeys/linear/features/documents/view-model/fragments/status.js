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

const clientState = ({ text, classes }, announcement) => ({
  text,
  classes,
  ...(announcement ? { announcement } : {})
})

// An unrecognised status is presented exactly as an unavailable one — the
// fallback is deliberate, so it is named once rather than written twice.
const unavailableClientState = clientState(
  UNAVAILABLE_STATE,
  copy.announcements.unavailable
)

// The presentation the browser applies to a row it updates itself. It is
// serialised from the copy bundles so no user-facing English or Welsh is ever
// assembled in client JavaScript. A checking row carries no announcement — a
// scan that has not settled is not news.
export const scanCopyJson = JSON.stringify({
  [SCAN_STATUS.PENDING]: clientState(SCAN_STATUS_TAGS[SCAN_STATUS.PENDING]),
  [SCAN_STATUS.COMPLETE]: clientState(
    SCAN_STATUS_TAGS[SCAN_STATUS.COMPLETE],
    copy.announcements.safe
  ),
  [SCAN_STATUS.REJECTED]: clientState(
    SCAN_STATUS_TAGS[SCAN_STATUS.REJECTED],
    copy.announcements.virus
  ),
  [SCAN_STATUS.UNAVAILABLE]: unavailableClientState,
  UNKNOWN: unavailableClientState
})
