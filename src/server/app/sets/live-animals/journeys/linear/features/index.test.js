import { describe, expect, test } from 'vitest'

import { pageModules } from './index.js'
import { revalidators } from '../revalidators.js'
import { REVIEW_CARDS } from './check-answers/view-model/incomplete-cards.js'

const dispatchModules = pageModules.filter((module) => module.meta)

describe('#revalidators — surfaces', () => {
  test('Every revalidator declares a surface', () => {
    for (const { id, surface } of revalidators) {
      expect(surface, `revalidator "${id}"`).toBeDefined()
      expect(['card', 'party'], `revalidator "${id}" surface kind`).toContain(
        surface.kind
      )
    }
  })

  test('Every card-surfaced revalidator names a real REVIEW_CARDS entry', () => {
    const cardIds = new Set(REVIEW_CARDS.map((card) => card.id))
    for (const { id, surface } of revalidators) {
      if (surface.kind !== 'card') {
        continue
      }
      expect(
        cardIds.has(surface.cardId),
        `revalidator "${id}" surface.cardId "${surface.cardId}"`
      ).toBe(true)
    }
  })

  test('No two card-surfaced revalidators share the same cardId', () => {
    const cardIds = revalidators
      .filter(({ surface }) => surface.kind === 'card')
      .map(({ surface }) => surface.cardId)
    expect(new Set(cardIds).size).toBe(cardIds.length)
  })
})

describe('#pageModules — validate-stored opt-in', () => {
  test('Every dispatch page either has a revalidator or explicitly opts out', () => {
    const revalidatorIds = new Set(revalidators.map(({ id }) => id))
    for (const module of dispatchModules) {
      const covered = revalidatorIds.has(module.meta.id)
      const optedOut = module.skipValidateStored === true
      expect(
        covered || optedOut,
        `dispatch page "${module.meta.id}" must either be listed in revalidators or export skipValidateStored = true`
      ).toBe(true)
    }
  })

  test('No dispatch page has both a revalidator and an opt-out', () => {
    const revalidatorIds = new Set(revalidators.map(({ id }) => id))
    for (const module of dispatchModules) {
      const covered = revalidatorIds.has(module.meta.id)
      const optedOut = module.skipValidateStored === true
      expect(
        covered && optedOut,
        `dispatch page "${module.meta.id}" should not be both listed in revalidators and opted out`
      ).toBe(false)
    }
  })

  test('Every revalidator id names a real dispatch page', () => {
    const dispatchIds = new Set(dispatchModules.map(({ meta }) => meta.id))
    for (const { id } of revalidators) {
      expect(dispatchIds.has(id), `revalidator "${id}"`).toBe(true)
    }
  })
})
