import { beforeEach, describe, expect, it } from 'vitest'

import {
  resetModulesAndRunModeEachTest,
  switchToRealMode,
  switchToStubMode
} from '../../../../../common/test-helpers/run-mode.js'
import {
  FERRET_RESULTS,
  fetchMocker,
  firstRequest,
  mockFetchEachTest,
  respondWith,
  respondWithJson
} from './test-support.js'

resetModulesAndRunModeEachTest()
mockFetchEachTest()

describe('#search', () => {
  describe('in stub mode', () => {
    beforeEach(switchToStubMode)

    it('Should search the stub catalogue from the first page, asking reference-data nothing', async () => {
      const { search } = await import('./search.js')

      expect(await search('ferret', { size: 10 })).toEqual(FERRET_RESULTS)
      expect(fetchMocker.requests()).toEqual([])
    })
  })

  describe('in real mode', () => {
    beforeEach(switchToRealMode)

    it('Should search through reference-data from the first page', async () => {
      respondWithJson(FERRET_RESULTS)
      const { search } = await import('./search.js')

      expect(await search('ferret', { size: 10 })).toEqual(FERRET_RESULTS)
      expect(new URL(firstRequest().url).searchParams.get('page')).toBe('0')
    })

    it.each([
      [400, 'Bad Request'],
      [503, 'Service Unavailable']
    ])(
      'Should report reference data as unavailable when the search answers %i',
      async (status, statusText) => {
        respondWith(status, statusText)
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
