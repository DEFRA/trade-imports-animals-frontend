import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

import { config } from '../../../../../../../../../config/config.js'
import {
  expectOneLogged,
  journeyRequest
} from '../../../../../../../engine/test-support.js'
import { SCAN_STATUS } from '../scan-poll.js'

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

  it('Should show a document as pending and log one warning with the journey id, the upload id and the error when the upload service call fails', async () => {
    const failure = new Error('upload service unavailable')
    fetchMocker.mockRejectOnce(failure)
    const request = journeyRequest('journey-1')

    const status = await scanStatusOf(
      { uploadId: 'up-1', filename: 'itahc.pdf' },
      { refresh: true, request }
    )

    expect(status).toBe(SCAN_STATUS.PENDING)
    expectOneLogged(request.logger, {
      level: 'warn',
      fields: { journeyId: 'journey-1', uploadId: 'up-1', err: failure },
      message:
        'Scan status unavailable: upload service call failed, document shown as pending'
    })
  })
})
