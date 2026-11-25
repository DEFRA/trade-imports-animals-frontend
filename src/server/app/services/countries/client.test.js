import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  okOnlyForBlock,
  okResponse,
  stubFetch
} from '../../../common/test-helpers/reference-data-fetch.js'
import { fetchCountries } from './client.js'

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('countries client', () => {
  it('Should parse a fetched [{code,name}] payload', async () => {
    stubFetch(async () => okResponse([{ code: 'ZZ', name: 'Zedland' }]))
    await expect(fetchCountries()).resolves.toEqual([
      { code: 'ZZ', name: 'Zedland' }
    ])
  })

  it('Should request countries filtered to the given blocks', async () => {
    stubFetch(okOnlyForBlock('GBNAG_SPS_EX', [{ code: 'ZZ', name: 'Zedland' }]))
    await expect(fetchCountries(['GBNAG_SPS_EX'])).resolves.toEqual([
      { code: 'ZZ', name: 'Zedland' }
    ])
  })

  it('Should throw on a non-ok response', async () => {
    stubFetch(async () => ({ ok: false, status: 503, statusText: 'Down' }))
    await expect(fetchCountries()).rejects.toThrow(
      'reference-data refused to get countries: 503 Down'
    )
  })
})
