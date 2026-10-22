import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { config } from '../../../../../../../../../config/config.js'
import { SCAN_STATUS } from '../scan-poll.js'

const recorded = vi.hoisted(() => {
  const entries = []
  const recordAt = (level) => (fields, message) =>
    entries.push({ level, fields, message })
  return {
    entries,
    logger: {
      debug: recordAt('debug'),
      info: recordAt('info'),
      warn: recordAt('warn'),
      error: recordAt('error')
    }
  }
})

vi.mock('../../../../../../../../common/helpers/logging/logger.js', () => ({
  createLogger: () => recorded.logger
}))

const fetchMocker = createFetchMock(vi)
fetchMocker.enableMocks()

describe('scanStatusOf', () => {
  const originalStubMode = config.get('stubMode')
  let scanStatusOf

  beforeAll(async () => {
    config.set('stubMode', false)
    ;({ scanStatusOf } = await import('./status.js'))
  })

  afterAll(() => config.set('stubMode', originalStubMode))

  it('Should show a document as pending and log a warning when the upload service call fails', async () => {
    const failure = new Error('upload service unavailable')
    fetchMocker.mockRejectOnce(failure)

    const status = await scanStatusOf(
      { uploadId: 'up-1', filename: 'itahc.pdf' },
      true
    )

    expect(status).toBe(SCAN_STATUS.PENDING)
    expect(recorded.entries).toEqual([
      {
        level: 'warn',
        fields: { err: failure, uploadId: 'up-1' },
        message:
          'Scan status unavailable: upload service call failed, document shown as pending'
      }
    ])
  })
})
