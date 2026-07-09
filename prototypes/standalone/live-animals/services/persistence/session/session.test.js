import { describe, expect, it } from 'vitest'
import { session } from './stub.js'
import { JOURNEY_COOKIE } from '../../../engine/persistence/session.js'
import { recordingH } from '../../../engine/test-support.js'

describe('#session.clearActive', () => {
  it('Should remove the journey cookie via h.unstate', async () => {
    const h = recordingH()
    await session.setActiveJourney(h, 'journey-1')
    expect(h.cookies[JOURNEY_COOKIE]).toBe('journey-1')

    await session.clearActive(h)

    expect(JOURNEY_COOKIE in h.cookies).toBe(false)
  })
})
