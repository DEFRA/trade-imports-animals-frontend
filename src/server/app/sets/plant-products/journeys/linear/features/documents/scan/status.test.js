import { describe, expect, it } from 'vitest'

import { MAX_POLL_ATTEMPTS, SCAN_STATUS } from '../scan-poll.js'
import { isStillSettling, scanStatusOf } from './status.js'

// Driven against the shared stub: an id it never issued is a not-found, which is
// exactly the read failure the fail-closed rule has to survive.
const UNKNOWN_UPLOAD = { uploadId: 'no-such-id' }

describe('plant-products documents scan status', () => {
  it('fails closed to checking when the status cannot be read', async () => {
    await expect(scanStatusOf(UNKNOWN_UPLOAD, { attempt: 0 })).resolves.toBe(
      SCAN_STATUS.PENDING
    )
  })

  it('is still checking on the last attempt below the ceiling', async () => {
    await expect(
      scanStatusOf(UNKNOWN_UPLOAD, { attempt: MAX_POLL_ATTEMPTS - 1 })
    ).resolves.toBe(SCAN_STATUS.PENDING)
  })

  it('becomes a distinguishable unavailable state at the attempt ceiling', async () => {
    await expect(
      scanStatusOf(UNKNOWN_UPLOAD, { attempt: MAX_POLL_ATTEMPTS })
    ).resolves.toBe(SCAN_STATUS.UNAVAILABLE)
  })

  it('reports a row with no file as having no scan rather than a verdict', async () => {
    await expect(scanStatusOf({})).resolves.toBe(SCAN_STATUS.NO_FILE)
  })

  it('lets a mixed settled page continue', () => {
    expect(
      isStillSettling([
        { scanStatus: SCAN_STATUS.COMPLETE },
        { scanStatus: SCAN_STATUS.NO_FILE }
      ])
    ).toBe(false)
  })

  it('holds the page while any row is unavailable', () => {
    expect(
      isStillSettling([
        { scanStatus: SCAN_STATUS.COMPLETE },
        { scanStatus: SCAN_STATUS.UNAVAILABLE }
      ])
    ).toBe(true)
  })
})
