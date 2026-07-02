import { describe, it, expect } from 'vitest'
import {
  changeTarget,
  firstApplicablePage,
  firstPagePresentingObligation,
  firstUnfulfilledPage,
  nextAfter,
  sectionEntry
} from './navigation.js'
import * as flowEval from '../flow-eval/index.js'
import { changePath, hubPath, pagePath } from '../journey/paths.js'
import { evaluate, journeyFlow, journeyModel } from './status.js'
import { createJourneyRepository } from '../store/index.js'

const { identifiers } = journeyModel()
const id = (name) => identifiers.idOf(name)

const evaluationWith = (values = {}) => {
  const repository = createJourneyRepository()
  const journey = repository.create(journeyFlow().id)
  const fulfilments = Object.fromEntries(
    Object.entries(values).map(([name, value]) => [id(name), { value }])
  )
  return evaluate(repository.saveFulfilments(journey.journeyId, fulfilments))
}

describe('contract/navigation — the doc primitives, by identity', () => {
  it('re-exports the three primitives unchanged (interrogation Level 1)', () => {
    expect(firstApplicablePage).toBe(flowEval.firstApplicablePage)
    expect(firstUnfulfilledPage).toBe(flowEval.firstUnfulfilledPage)
    expect(firstPagePresentingObligation).toBe(
      flowEval.firstPagePresentingObligation
    )
  })
})

describe('contract/navigation — URL-returning journey moves', () => {
  it('nextAfter advances within the Section and falls back to the hub', () => {
    const evaluation = evaluationWith()
    expect(nextAfter('about-you', evaluation)).toBe(pagePath('your-vehicle'))
    expect(nextAfter('your-vehicle', evaluation)).toBe(hubPath())
  })

  it('nextAfter honours the claims gate either way', () => {
    expect(
      nextAfter('driving-history', evaluationWith({ hadClaims: 'yes' }))
    ).toBe(pagePath('claims'))
    expect(
      nextAfter('driving-history', evaluationWith({ hadClaims: 'no' }))
    ).toBe(pagePath('cover-type'))
  })

  it('nextAfter skips an already-Fulfilled page', () => {
    const evaluation = evaluationWith({ registration: 'AB12CDE' })
    expect(nextAfter('about-you', evaluation)).toBe(hubPath())
  })

  it('returns to the hub at an add-on task boundary (spike-a parity)', () => {
    const evaluation = evaluationWith({
      addons: ['named-driver', 'modifications']
    })
    // The picker save never walks into a spawned SubSection…
    expect(nextAfter('addons', evaluation)).toBe(hubPath())
    // …within one add-on the advance is linear…
    expect(nextAfter('named-driver-who', evaluation)).toBe(
      pagePath('addons/named-driver/relationship')
    )
    // …and the last step of an add-on returns to the hub, never the
    // next selected add-on's first step.
    expect(nextAfter('named-driver-relationship', evaluation)).toBe(hubPath())
  })

  it('sectionEntry resolves a Task List click; unknown sections throw', () => {
    const evaluation = evaluationWith()
    expect(sectionEntry('your-driving-and-cover', evaluation)).toBe(
      pagePath('driving-history')
    )
    expect(() => sectionEntry('no-such-section', evaluation)).toThrow(
      /Unknown section/
    )
  })

  it('changeTarget round-trips plain question pages via ?change=1', () => {
    expect(changeTarget('fullName')).toBe(changePath('about-you'))
    expect(changeTarget('hadClaims')).toBe(changePath('driving-history'))
  })

  it('changeTarget sends collection and picker rows through their own flow', () => {
    expect(changeTarget('claimType')).toBe(pagePath('claims'))
    expect(changeTarget('addons')).toBe(pagePath('addons'))
    expect(changeTarget('ncdYears')).toBe(
      pagePath('addons/protected-ncd/years')
    )
  })

  it('changeTarget throws for an obligation no page presents', () => {
    expect(() => changeTarget('nope')).toThrow(/Unknown obligation/)
  })
})
