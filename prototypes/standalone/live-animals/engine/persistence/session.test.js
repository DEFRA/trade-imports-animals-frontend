import { describe, expect, it } from 'vitest'
import { JOURNEY_COOKIE, session } from './session.js'
import { recordingH } from '../test-support.js'

describe('#session.clearActive', () => {
  it('Should remove the journey cookie via h.unstate', () => {
    const h = recordingH()
    session.setActiveJourney(h, 'journey-1')
    expect(h.cookies[JOURNEY_COOKIE]).toBe('journey-1')

    session.clearActive(h)

    expect(JOURNEY_COOKIE in h.cookies).toBe(false)
  })
})
