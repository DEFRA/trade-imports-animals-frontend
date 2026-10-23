import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import createFetchMock from 'vitest-fetch-mock'

const fetchMocker = createFetchMock(vi)

const originalMode = process.env.STUB_MODE

const FERRET_RESULTS = {
  total: 1,
  page: 0,
  size: 10,
  groups: [
    {
      code: '01061900',
      species: [{ latinName: 'Mustela putorius furo', commonName: 'Ferret' }]
    }
  ]
}

const BOS_SPP = { code: '0102', latinName: 'Bos spp.' }

const respondWith = (status, statusText) =>
  fetchMocker.mockResponse(() => ({ status, statusText, body: '' }))

const respondWithJson = (body) => fetchMocker.mockResponse(JSON.stringify(body))

const firstRequest = () => fetchMocker.requests()[0]

beforeEach(() => {
  vi.resetModules()
  fetchMocker.enableMocks()
  fetchMocker.resetMocks()
})

afterEach(() => {
  fetchMocker.disableMocks()
  if (originalMode === undefined) {
    delete process.env.STUB_MODE
  } else {
    process.env.STUB_MODE = originalMode
  }
})

describe('#fetchCommodities', () => {
  it('Should ask reference-data for one page of a search', async () => {
    respondWithJson(FERRET_RESULTS)
    const { fetchCommodities } = await import('./client.js')

    expect(await fetchCommodities('ferret', { page: 0, size: 10 })).toEqual(
      FERRET_RESULTS
    )

    const url = new URL(firstRequest().url)
    expect(firstRequest().method).toBe('GET')
    expect(url.pathname).toBe('/commodities')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      q: 'ferret',
      page: '0',
      size: '10'
    })
  })

  it('Should throw with the status on a non-ok response', async () => {
    respondWith(500, 'Error')
    const { fetchCommodities } = await import('./client.js')

    await expect(
      fetchCommodities('ferret', { page: 0, size: 10 })
    ).rejects.toMatchObject({
      message: 'Failed to search commodities',
      status: 500,
      statusText: 'Error'
    })
  })
})

describe('#linesWithUnlistedSpecies', () => {
  describe('in real mode', () => {
    beforeEach(() => {
      process.env.STUB_MODE = 'false'
    })

    it('Should ask reference-data which lines are not listed', async () => {
      respondWithJson({ unlisted: [BOS_SPP] })
      const { linesWithUnlistedSpecies } = await import('./species-check.js')

      expect(await linesWithUnlistedSpecies([BOS_SPP])).toEqual([BOS_SPP])

      expect(new URL(firstRequest().url).pathname).toBe(
        '/commodities/species-check'
      )
      expect(firstRequest().method).toBe('POST')
      expect(await firstRequest().json()).toEqual({ lines: [BOS_SPP] })
    })

    it.each([
      [400, 'Bad Request'],
      [503, 'Service Unavailable']
    ])(
      'Should report reference data as unavailable when the check answers %i',
      async (status, statusText) => {
        respondWith(status, statusText)
        const { linesWithUnlistedSpecies } = await import('./species-check.js')

        const error = await linesWithUnlistedSpecies([BOS_SPP]).catch(
          (caught) => caught
        )

        expect(error.isBoom).toBe(true)
        expect(error.output.statusCode).toBe(503)
        expect(error.data.dataset).toBe('commodities')
      }
    )
  })
})
