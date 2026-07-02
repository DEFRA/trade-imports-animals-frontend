import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  addIndexedFulfilment,
  applyPageAnswers,
  reconcileJourney,
  removeIndexedFulfilment
} from './index.js'
import { loadJourneyModel } from '../engine/index.js'
import { createJourneyRepository } from '../store/index.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const flow = JSON.parse(
  fs.readFileSync(path.join(dirname, '../model/flow.json'), 'utf8')
)

const findPage = (node, pageId) => {
  if (node.kind === 'page' && node.id === pageId) {
    return node
  }
  for (const child of node.children ?? []) {
    const found = findPage(child, pageId)
    if (found) {
      return found
    }
  }
  return undefined
}

const page = (pageId) => {
  const found = flow.sections
    .map((section) => findPage(section, pageId))
    .find(Boolean)
  if (!found) {
    throw new Error(`No page "${pageId}" in flow.json`)
  }
  return found
}

const { identifiers } = loadJourneyModel()
const id = (name) => identifiers.idOf(name)

const setup = () => {
  const repository = createJourneyRepository()
  const journey = repository.create(flow.id)
  return { repository, journey, options: { repository } }
}

describe('orchestrator/index — write -> fixed point -> save (risk 7)', () => {
  it('applyPageAnswers persists the post-pass state, handlers included', () => {
    const { repository, journey, options } = setup()
    const { journey: saved, evaluation } = applyPageAnswers(
      journey,
      page('driving-history'),
      { yearsNoClaims: '5', hadClaims: 'yes', penaltyPoints: '0' },
      options
    )
    expect(saved.fulfilments[id('hadClaims')]).toEqual({ value: 'yes' })
    expect(saved.fulfilments[id('premium')].value).toBeGreaterThan(0)
    expect(repository.get(journey.journeyId)).toEqual(saved)
    expect(evaluation.obligations[id('hadClaims')].fulfilled).toBe(true)
  })

  it('claims add/remove mint and drop ONE shared row and persist it', () => {
    const { repository, journey, options } = setup()
    const first = applyPageAnswers(
      journey,
      page('driving-history'),
      { hadClaims: 'yes' },
      options
    )
    const added = addIndexedFulfilment(
      first.journey,
      ['claimType', 'claimAmount'],
      { claimType: 'theft', claimAmount: '450' },
      options
    )
    expect(added.journey.fulfilments[id('claimType')]).toEqual({
      [added.fulfilmentId]: { value: 'theft' }
    })
    expect(added.journey.fulfilments[id('claimAmount')]).toEqual({
      [added.fulfilmentId]: { value: '450' }
    })

    const removed = removeIndexedFulfilment(
      added.journey,
      ['claimType', 'claimAmount'],
      added.fulfilmentId,
      options
    )
    // Removing the last row deletes the envelope too — the empty-map
    // reviewed marker belongs to markCollectionReviewed alone.
    expect(removed.journey.fulfilments[id('claimType')]).toBeUndefined()
    expect(repository.get(journey.journeyId)).toEqual(removed.journey)
  })

  it('the ?change=1 path is the same path: Yes-No-Yes wipes and never rehydrates', () => {
    const { journey, options } = setup()
    const yes = applyPageAnswers(
      journey,
      page('driving-history'),
      { hadClaims: 'yes' },
      options
    )
    const withClaim = addIndexedFulfilment(
      yes.journey,
      ['claimType', 'claimAmount'],
      { claimType: 'theft', claimAmount: '450' },
      options
    )

    // The change-mode POST from CYA flows through applyPageAnswers too —
    // there is no bypass for ?change=1 to skip the scope-exit wipe.
    const no = applyPageAnswers(
      withClaim.journey,
      page('driving-history'),
      { hadClaims: 'no' },
      options
    )
    expect(no.journey.fulfilments[id('claimType')]).toBeUndefined()
    expect(no.wiped.map((wipe) => wipe.name)).toContain('claimType')

    const yesAgain = applyPageAnswers(
      no.journey,
      page('driving-history'),
      { hadClaims: 'yes' },
      options
    )
    expect(yesAgain.journey.fulfilments[id('claimType')]).toBeUndefined()
  })

  it('reconcileJourney persists the pruned set and surfaces drops to log', () => {
    const { repository, journey, options } = setup()
    repository.saveFulfilments(journey.journeyId, {
      'id-no-longer-in-model': { value: 'stale' },
      [id('fullName')]: { value: 'Alex Driver' }
    })
    const { journey: saved, drops } = reconcileJourney(
      repository.get(journey.journeyId),
      options
    )
    expect(saved.fulfilments['id-no-longer-in-model']).toBeUndefined()
    expect(saved.fulfilments[id('fullName')]).toEqual({ value: 'Alex Driver' })
    expect(drops).toContainEqual({
      obligationId: 'id-no-longer-in-model',
      reason: 'unknown-obligation'
    })
    expect(repository.get(journey.journeyId)).toEqual(saved)
  })

  it('a submitted journey rejects every mutating path (the storage freeze)', () => {
    const { repository, journey, options } = setup()
    repository.submit(journey.journeyId)
    expect(() =>
      applyPageAnswers(
        repository.get(journey.journeyId),
        page('driving-history'),
        { hadClaims: 'yes' },
        options
      )
    ).toThrow(/writes are blocked/)
  })
})
