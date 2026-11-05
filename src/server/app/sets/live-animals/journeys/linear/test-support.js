import { it } from 'vitest'
import { pagePath } from '../../../../shared/paths.js'
import { appendChangeContext } from '../../../../shared/kit.js'
import {
  driveHandler,
  expectBackLinkIsPath
} from '../../../../engine/test-support.js'

export const itSendsBackCarryingChangeTo = (get, cases) =>
  it.each(cases)(
    'Should send Back to %s carrying the change on a draft opened from a Change link',
    async (_description, seed, slug) => {
      const result = await driveHandler(get, { seed, query: { change: '1' } })

      expectBackLinkIsPath(
        result,
        appendChangeContext(pagePath(result.journeyId, slug))
      )
    }
  )
