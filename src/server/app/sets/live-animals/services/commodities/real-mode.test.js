import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const originalMode = process.env.STUB_MODE

const okResponse = (body) => ({ ok: true, json: async () => body })

// reference-data's answer for "ferret", as TST's MDM data gives it.
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
})

afterEach(() => {
  vi.unstubAllGlobals()
  if (originalMode === undefined) {
    delete process.env.STUB_MODE
  } else {
    process.env.STUB_MODE = originalMode
  }
})

describe('commodities client', () => {
  it('Should ask reference-data for one page of a search', async () => {
    const fetchMock = vi.fn(async () => okResponse(FERRET_RESULTS))
    vi.stubGlobal('fetch', fetchMock)
    const { fetchCommodities } = await import('./client.js')

    expect(await fetchCommodities('ferret', { page: 0, size: 10 })).toEqual(
      FERRET_RESULTS
    )
    const url = new URL(fetchMock.mock.calls[0][0])
    expect(url.pathname).toBe('/commodities')
    expect(Object.fromEntries(url.searchParams)).toEqual({
      search: 'ferret',
      page: '0',
      size: '10'
    })
  })

  it('Should throw on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 500, statusText: 'Error' }))
    )
    const { fetchCommodities } = await import('./client.js')

    await expect(
      fetchCommodities('ferret', { page: 0, size: 10 })
    ).rejects.toThrow('Failed to search commodities')
  })
})

describe('species check — real mode', () => {
  const BOS_SPP = { code: '0102', latinName: 'Bos spp.' }

  it('Should ask reference-data which lines MDM no longer lists', async () => {
    process.env.STUB_MODE = 'false'
    const fetchMock = vi.fn(async () => okResponse({ missing: [BOS_SPP] }))
    vi.stubGlobal('fetch', fetchMock)
    const { missingSpecies } = await import('./species-check.js')

    expect(await missingSpecies([BOS_SPP])).toEqual([BOS_SPP])
    const [url, init] = fetchMock.mock.calls[0]
    expect(new URL(url).pathname).toBe('/commodities/species-check')
    expect(init.method).toBe('POST')
    expect(JSON.parse(init.body)).toEqual({ lines: [BOS_SPP] })
  })

  it('Should report reference data as unavailable when the check fails', async () => {
    process.env.STUB_MODE = 'false'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, statusText: 'Down' }))
    )
    const { missingSpecies } = await import('./species-check.js')

    const error = await missingSpecies([BOS_SPP]).catch((caught) => caught)
    expect(error.isBoom).toBe(true)
    expect(error.data.dataset).toBe('commodities')
  })
})

describe('commodities search — real mode', () => {
  it('Should search through reference-data', async () => {
    process.env.STUB_MODE = 'false'
    const fetchMock = vi.fn(async () => okResponse(FERRET_RESULTS))
    vi.stubGlobal('fetch', fetchMock)
    const commodities = await import('./search.js')

    expect(await commodities.search('ferret', { size: 10 })).toEqual(
      FERRET_RESULTS
    )
    expect(new URL(fetchMock.mock.calls[0][0]).searchParams.get('page')).toBe(
      '0'
    )
  })

  it('Should report reference data as unavailable when the search fails', async () => {
    process.env.STUB_MODE = 'false'
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({ ok: false, status: 503, statusText: 'Down' }))
    )
    const commodities = await import('./search.js')

    const error = await commodities
      .search('ferret', { size: 10 })
      .catch((caught) => caught)
    expect(error.isBoom).toBe(true)
    expect(error.output.statusCode).toBe(503)
    expect(error.data.dataset).toBe('commodities')
  })
})
