import { SET_ID } from '../../../set.js'
import { describe, expect, it } from 'vitest'

import { dashboardPath, hubPath } from '../../../../../shared/paths.js'
import { useStubbedJourney } from '../../../../../engine/test-support.js'
import { dispatchPages } from '../features/index.js'
import { entryBackLink } from './entry-guard.js'

describe('#entryBackLink', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should send Back to the overview once a notification answer is committed', () => {
    expect(entryBackLink({ journeyId: 'j-1' }, { countryOfOrigin: 'FR' })).toBe(
      hubPath('j-1')
    )
  })

  it('Should send Back to the dashboard while nothing is committed', () => {
    expect(entryBackLink({ journeyId: 'j-1' }, {})).toBe(dashboardPath())
  })
})
