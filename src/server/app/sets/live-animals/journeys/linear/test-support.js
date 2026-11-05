import { it } from 'vitest'
import { hubPath, pagePath } from '../../../../shared/paths.js'
import { RUN_ACTIVE } from '../../../../flow/run-state.js'
import { appendChangeContext } from '../../../../shared/kit.js'
import {
  amendmentOpenedFromChangeLink,
  driveHandler,
  expectBackLinkIsPath,
  openedFromChangeLink,
  openingRunAt
} from '../../../../engine/test-support.js'

export const itSendsBackCarryingChangeTo = (get, cases) =>
  it.each(cases)(
    'Should send Back to %s carrying the change on a draft opened from a Change link',
    async (_description, seed, slug) => {
      const result = await driveHandler(get, {
        seed,
        startingFrom: [openedFromChangeLink()]
      })

      expectBackLinkIsPath(
        result,
        appendChangeContext(pagePath(result.journeyId, slug))
      )
    }
  )

export const itSendsBackToOverview = (get, { seed = {}, cases } = {}) => {
  const overviewCases = [
    [
      'while the opening run is active',
      { startingFrom: [openingRunAt(RUN_ACTIVE)] }
    ],
    [
      'on a draft opened from a Change link',
      { startingFrom: [openedFromChangeLink()] }
    ],
    ['when opened from the Overview', {}],
    [
      'on an amendment opened from a Change link',
      { startingFrom: amendmentOpenedFromChangeLink() }
    ]
  ]

  return it.each(
    overviewCases.filter(
      ([description]) => !cases || cases.includes(description)
    )
  )('Should send Back to the Overview %s', async (_description, options) => {
    const result = await driveHandler(get, { seed, ...options })

    expectBackLinkIsPath(result, hubPath(result.journeyId))
  })
}

export const itSendsBackToOverviewOnRefusal = (post, payload, seed = {}) =>
  it('Should send Back to the Overview on the refused re-render while the opening run is active', async () => {
    const result = await driveHandler(post, {
      seed,
      payload,
      startingFrom: [openingRunAt(RUN_ACTIVE)]
    })

    expectBackLinkIsPath(result, hubPath(result.journeyId))
  })
