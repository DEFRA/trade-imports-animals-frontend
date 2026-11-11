import { describe, it } from 'vitest'
import { hubPath, pagePath } from '../../../../shared/paths.js'
import { CYA_SLUG, TRAIL_START, withTrail } from '../../../../shared/kit.js'
import {
  amendmentOpened,
  driveHandler,
  expectBackLinkIsPath,
  trailQuery
} from '../../../../engine/test-support.js'
import { lineOf } from './features/commodities/search/test-support.js'

/**
 * A consignment of commodity lines that already hold animal identifier
 * records, for a page or a test that needs an animal whose commodity and
 * species pair needs a permanent address. Carries the country of origin
 * every page's Save and continue needs before it will open a later page.
 *
 * @param {...{row: object, units: object[]}} lines - one entry per
 * commodity line: `row` is a species row from `search/test-support.js`,
 * `units` its animal identifier records, in order.
 * @returns {{countryOfOrigin: string, commodityLines: object[]}} the seed.
 */
export const petConsignmentSeed = (...lines) => ({
  countryOfOrigin: 'FR',
  commodityLines: lines.map(({ row, units }) =>
    lineOf(row, {
      numberOfAnimalsQuantity: String(units.length),
      animalIdentifiers: units
    })
  )
})

const backCases = ({ previousPage }) => [
  ...(previousPage
    ? [
        [
          'the page Save and continue was pressed on',
          [{ query: trailQuery(TRAIL_START.overview, previousPage) }],
          (journeyId) =>
            withTrail(pagePath(journeyId, previousPage), [TRAIL_START.overview])
        ]
      ]
    : []),
  [
    'Overview when opened from Overview',
    [{ query: trailQuery(TRAIL_START.overview) }],
    (journeyId) => hubPath(journeyId)
  ],
  [
    'the review when opened from a Change link',
    [{ query: trailQuery(CYA_SLUG) }],
    (journeyId) => pagePath(journeyId, CYA_SLUG)
  ],
  [
    'the review when opened from a Change link while amending',
    [amendmentOpened(), { query: trailQuery(CYA_SLUG) }],
    (journeyId) => pagePath(journeyId, CYA_SLUG)
  ],
  [
    'Overview when the trail names a place the journey does not have',
    [{ query: trailQuery('not-a-place') }],
    (journeyId) => hubPath(journeyId)
  ],
  [
    'Overview when nothing says where the trader came from',
    [],
    (journeyId) => hubPath(journeyId)
  ]
]

/**
 * Registers the Back cases of a page rendered by `get`: one test for each
 * place the trader can have come from.
 */
export const itSendsBackToWhereTheTraderCameFrom = (
  get,
  { seed = {}, previousPage } = {}
) =>
  describe('Back', () => {
    it.each(backCases({ previousPage }))(
      'Should go to %s',
      async (_entryPoint, startingFrom, backLinkFor) => {
        const result = await driveHandler(get, { seed, startingFrom })

        expectBackLinkIsPath(result, backLinkFor(result.journeyId))
      }
    )
  })

/**
 * Registers the Back case of a refused save: the page shown again goes Back
 * to the page Save and continue was pressed on.
 */
export const itSendsBackToWhereTheTraderCameFromOnRefusal = (
  post,
  { seed = {}, payload, savedPage }
) =>
  it(`Should go back to ${savedPage}, the page Save and continue was pressed on, from the page shown again after a refused save`, async () => {
    const result = await driveHandler(post, {
      seed,
      payload,
      startingFrom: [{ query: trailQuery(TRAIL_START.overview, savedPage) }]
    })

    expectBackLinkIsPath(
      result,
      withTrail(pagePath(result.journeyId, savedPage), [TRAIL_START.overview])
    )
  })

export const pagePathFrom = (startPlace, journeyId, slug) =>
  withTrail(pagePath(journeyId, slug), [TRAIL_START[startPlace]])
