import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  okResponse,
  stubFetch
} from '../../../common/test-helpers/reference-data-fetch.js'
import { fetchPortsOfEntry } from './client.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('ports client', () => {
  it('Should parse a fetched [{code,name}] payload', async () => {
    stubFetch(async () => okResponse([{ code: 'GB ZZZ', name: 'Zed Port' }]))
    await expect(fetchPortsOfEntry()).resolves.toEqual([
      { code: 'GB ZZZ', name: 'Zed Port' }
    ])
  })

  it('Should throw on a non-ok response', async () => {
    stubFetch(async () => ({ ok: false, status: 500, statusText: 'Boom' }))
    await expect(fetchPortsOfEntry()).rejects.toThrow(
      'reference-data refused to get ports of entry: 500 Boom'
    )
  })
})
