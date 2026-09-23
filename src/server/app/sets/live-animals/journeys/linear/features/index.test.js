import { describe, expect, test } from 'vitest'

import { pageModules } from './index.js'
import { revalidators } from '../revalidators.js'
import {
  REVIEW_CARDS,
  cardForPageId
} from './check-answers/view-model/incomplete-cards.js'

const dispatchModules = pageModules.filter((module) => module.meta)

describe('#revalidators — card mapping', () => {
  test('Every revalidator id maps to exactly one review card', () => {
    for (const { id } of revalidators) {
      const cardMatches = REVIEW_CARDS.filter((card) =>
        (card.pages ?? []).includes(id)
      )
      expect(cardMatches, `revalidator "${id}"`).toHaveLength(1)
    }
  })

  test('cardForPageId returns the matching card for every revalidator id', () => {
    for (const { id } of revalidators) {
      expect(cardForPageId(id), `revalidator "${id}"`).toBeDefined()
    }
  })

  test('Every card page id resolves to a defined page module', () => {
    const dispatchIds = new Set(dispatchModules.map(({ meta }) => meta.id))
    const allCardPageIds = REVIEW_CARDS.flatMap((card) => card.pages ?? [])
    for (const pageId of allCardPageIds) {
      expect(dispatchIds.has(pageId), `card page "${pageId}"`).toBe(true)
    }
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
