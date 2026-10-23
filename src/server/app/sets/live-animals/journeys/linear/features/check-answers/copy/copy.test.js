import { SET_ID } from '../../../../../set.js'
import { describe, expect, it } from 'vitest'

import {
  stubH,
  journeyRequest,
  useStubbedJourney
} from '../../../../../../../engine/test-support.js'
import { store } from '../../../../../../../engine/store.js'
import { dispatchPages } from '../../index.js'
import { leaves, isCopyLeaf } from '../../../../../../../shared/copy-leaves.js'

import { routes } from '../controller.js'
import { copy } from './copy.en.js'

describe('#copy', () => {
  it('Should have a non-empty string or copy function at every leaf', () => {
    for (const { path, value } of leaves(copy)) {
      expect(isCopyLeaf(value), `${path} must be copy`).toBe(true)
    }
  })

  it('Should interpolate the parameterised leaves', () => {
    expect(copy.identifierTable.animalN(2)).toBe('Animal 2')
    expect(copy.documentN(1)).toBe('Document 1')
    expect(copy.hidden.commodity(3)).toBe('commodity 3')
  })
})

describe('GET check-answers — copy reaches the view', () => {
  useStubbedJourney(SET_ID, dispatchPages)

  it('Should supply the feature copy module and the shared chrome copy', async () => {
    const journey = await store.create()
    const h = stubH()
    const handler = routes.find((route) => route.method === 'GET').handler
    await handler(journeyRequest(journey.journeyId), h)
    const { context } = h.captured.view
    expect(context.copy).toBe(copy)
    expect(context.pageTitle).toBe(copy.title)
    expect(context.sharedCopy.layout.serviceName).toBe(
      'Import notification service'
    )
  })
})
