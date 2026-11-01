import { beforeEach, describe, expect, it } from 'vitest'

import {
  resetModulesAndRunModeEachTest,
  switchToRealMode,
  switchToStubMode
} from '../../../../../common/test-helpers/run-mode.js'
import {
  fetchMocker,
  firstRequest,
  mockFetchEachTest,
  respondWith,
  respondWithJson
} from './test-support.js'

const BOS_SPP = { code: '0102', latinName: 'Bos spp.' }

resetModulesAndRunModeEachTest()
mockFetchEachTest()

describe('#linesWithUnlistedSpecies', () => {
  describe('in stub mode', () => {
    beforeEach(switchToStubMode)

    it('Should return the lines whose species is not listed under their code', async () => {
      const { linesWithUnlistedSpecies } = await import('./species-check.js')

      expect(
        await linesWithUnlistedSpecies([
          { code: '0102', latinName: 'Bos taurus' },
          { code: '0102', latinName: 'Bos spp.' },
          { code: '0101', latinName: 'Felis catus' }
        ])
      ).toEqual([
        { code: '0102', latinName: 'Bos spp.' },
        { code: '0101', latinName: 'Felis catus' }
      ])
    })
  })

  describe('in real mode', () => {
    beforeEach(switchToRealMode)

    it('Should return nothing and send no request when there is nothing to check', async () => {
      const { linesWithUnlistedSpecies } = await import('./species-check.js')

      expect(await linesWithUnlistedSpecies([])).toEqual([])
      expect(fetchMocker.requests()).toEqual([])
    })

    it('Should report reference data as unavailable when the reply has no unlisted list', async () => {
      respondWithJson({})
      const { linesWithUnlistedSpecies } = await import('./species-check.js')

      const error = await linesWithUnlistedSpecies([BOS_SPP]).catch(
        (caught) => caught
      )

      expect(error.isBoom).toBe(true)
      expect(error.output.statusCode).toBe(503)
      expect(error.data.dataset).toBe('commodities')
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
