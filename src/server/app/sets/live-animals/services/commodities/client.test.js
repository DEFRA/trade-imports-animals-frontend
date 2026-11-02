import { describe, expect, it } from 'vitest'

import { fetchCommodities } from './client.js'
import {
  FERRET_RESULTS,
  firstRequest,
  mockFetchEachTest,
  respondWith,
  respondWithJson
} from './test-support.js'

mockFetchEachTest()

describe('#fetchCommodities', () => {
  it('Should ask reference-data for one page of a search', async () => {
    respondWithJson(FERRET_RESULTS)

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

    await expect(
      fetchCommodities('ferret', { page: 0, size: 10 })
    ).rejects.toMatchObject({
      message: 'Failed to search commodities',
      status: 500,
      statusText: 'Error'
    })
  })
})
