import { describe, it, expect, afterEach } from 'vitest'
import { createJourneyRepository, journeyRepository } from './index.js'

describe('store/index — barrel and app-level singleton', () => {
  afterEach(() => {
    journeyRepository.clear()
  })

  it('exposes the factory and a working singleton repository', () => {
    const journey = journeyRepository.create('flow')
    expect(journeyRepository.get(journey.journeyId)).toEqual(journey)
  })

  it('factory instances are independent of the singleton', () => {
    const isolated = createJourneyRepository()
    const journey = isolated.create('flow')
    expect(journeyRepository.has(journey.journeyId)).toBe(false)
    expect(isolated.has(journey.journeyId)).toBe(true)
  })
})
