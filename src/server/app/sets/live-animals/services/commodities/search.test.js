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

describe('#search', () => {
  describe('in stub mode', () => {
    beforeEach(() => {
      process.env.STUB_MODE = 'true'
    })

    it('Should search the stub catalogue from the first page, asking reference-data nothing', async () => {
      const { search } = await import('./search.js')

      expect(await search('ferret', { size: 10 })).toEqual(FERRET_RESULTS)
      expect(fetchMocker.requests()).toEqual([])
    })
  })

  describe('in real mode', () => {
    beforeEach(() => {
      process.env.STUB_MODE = 'false'
    })

    it('Should search through reference-data from the first page', async () => {
      fetchMocker.mockResponse(JSON.stringify(FERRET_RESULTS))
      const { search } = await import('./search.js')

      expect(await search('ferret', { size: 10 })).toEqual(FERRET_RESULTS)
      expect(
        new URL(fetchMocker.requests()[0].url).searchParams.get('page')
      ).toBe('0')
    })

    it.each([
      [400, 'Bad Request'],
      [503, 'Service Unavailable']
    ])(
      'Should report reference data as unavailable when the search answers %i',
      async (status, statusText) => {
        fetchMocker.mockResponse(() => ({ status, statusText, body: '' }))
        const { search } = await import('./search.js')

        const error = await search('ferret', { size: 10 }).catch(
          (caught) => caught
        )

        expect(error.isBoom).toBe(true)
        expect(error.output.statusCode).toBe(503)
        expect(error.data.dataset).toBe('commodities')
      }
    )
  })
})
