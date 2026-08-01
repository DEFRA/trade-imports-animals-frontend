import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  enforcedAtContinue,
  maxEntriesFrom,
  systemAnswerKeys,
  systemPopulated,
  unrecognisedAnswerKeys
} from './obligation-source.js'
import { configureObligationSet } from '../model/obligations/manifest.js'
import { configureJourneyFlow } from '../flow/journey-flow.js'
import { withSetContext } from '../shared/set-context.js'
import * as liveAnimalsObligationSet from '../sets/live-animals/obligations/index.js'

const policySurfaces = () => ({
  systemPopulated: [...systemPopulated()],
  enforcedAtContinue: [...enforcedAtContinue()],
  maxEntriesFrom: maxEntriesFrom(),
  systemAnswerKeys: [...systemAnswerKeys()]
})

afterEach(() => {
  configureObligationSet('live-animals', liveAnimalsObligationSet)
})

describe('single-set policy derivation', () => {
  it('derives each policy surface from the configured manifest', () => {
    configureObligationSet('synthetic', {
      obligations: [],
      groups: [],
      policy: {
        systemPopulated: ['fieldA'],
        enforcedAtContinue: ['fieldB'],
        maxEntriesFrom: { things: 'thingCount' },
        systemAnswerKeys: ['customRef']
      }
    })
    configureJourneyFlow('synthetic', { flowOnlyKeys: [] })

    withSetContext('synthetic', () => {
      expect(systemPopulated().has('fieldA')).toBe(true)
      expect(systemPopulated().has('poApprovedReferenceNumber')).toBe(false)
      expect(enforcedAtContinue().has('fieldB')).toBe(true)
      expect(maxEntriesFrom().things).toBe('thingCount')
      expect(maxEntriesFrom().animalIdentifiers).toBeUndefined()
      expect(unrecognisedAnswerKeys({ customRef: 'x' })).toEqual([])
      expect(unrecognisedAnswerKeys({ referenceNumber: 'x' })).toEqual([
        { key: 'referenceNumber', path: '(top level)' }
      ])
    })
  })
})

describe('empty-safe policy defaults', () => {
  it('returns empty surfaces when the configured manifest has no policy', () => {
    configureObligationSet('without-policy', {
      obligations: [],
      groups: []
    })

    expect(withSetContext('without-policy', policySurfaces)).toEqual({
      systemPopulated: [],
      enforcedAtContinue: [],
      maxEntriesFrom: {},
      systemAnswerKeys: []
    })
  })

  it('returns empty surfaces when the active set is unconfigured', () => {
    expect(withSetContext('unconfigured', policySurfaces)).toEqual({
      systemPopulated: [],
      enforcedAtContinue: [],
      maxEntriesFrom: {},
      systemAnswerKeys: []
    })
  })

  it('returns empty surfaces when no set context is resolvable', async () => {
    vi.resetModules()
    const context = await import('../shared/set-context.js')
    const source = await import('./obligation-source.js')
    context.registerSetMount('a', '/a')
    context.registerSetMount('b', '/b')

    expect({
      systemPopulated: [...source.systemPopulated()],
      enforcedAtContinue: [...source.enforcedAtContinue()],
      maxEntriesFrom: source.maxEntriesFrom(),
      systemAnswerKeys: [...source.systemAnswerKeys()]
    }).toEqual({
      systemPopulated: [],
      enforcedAtContinue: [],
      maxEntriesFrom: {},
      systemAnswerKeys: []
    })
    vi.resetModules()
  })
})

describe('live-animals policy derivation', () => {
  it('derives the current live-animals policy surfaces exactly', () => {
    expect(withSetContext('live-animals', policySurfaces)).toEqual({
      systemPopulated: ['poApprovedReferenceNumber'],
      enforcedAtContinue: ['countryOfOrigin', 'commoditySelection'],
      maxEntriesFrom: {
        animalIdentifiers: 'numberOfAnimalsQuantity'
      },
      systemAnswerKeys: ['referenceNumber']
    })
  })
})

describe('co-resident policy derivation', () => {
  it('keeps interleaved reads for two configured set ids separate', () => {
    configureObligationSet('a', {
      obligations: [],
      groups: [],
      policy: { enforcedAtContinue: ['fieldA'] }
    })
    configureObligationSet('b', {
      obligations: [],
      groups: [],
      policy: { enforcedAtContinue: ['fieldB'] }
    })

    expect([
      withSetContext('a', () => [...enforcedAtContinue()]),
      withSetContext('b', () => [...enforcedAtContinue()]),
      withSetContext('a', () => [...enforcedAtContinue()])
    ]).toEqual([['fieldA'], ['fieldB'], ['fieldA']])
  })
})
