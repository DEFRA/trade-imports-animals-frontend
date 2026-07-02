import { describe, it, expect } from 'vitest'
import { evaluateObligations } from './evaluate.js'
import { loadJourneyModel } from './load-model.js'
import { unfulfilledMandatory } from './mandates.js'
import { ENGINE_MANDATORY_ALWAYS } from './scope/index.js'

const { obligations, identifiers } = loadJourneyModel()
const id = (name) => identifiers.idOf(name)

const single = (name, value) => [id(name), { value }]
const state = (...entries) => Object.fromEntries(entries)

const entryOf = (evaluation, name) => evaluation.obligations[id(name)]

describe('engine/evaluate — scope and mandate over the real model', () => {
  const empty = evaluateObligations(obligations, {})

  it('keys the result by obligation id, one entry per record', () => {
    expect(Object.keys(empty.obligations).sort()).toEqual(
      obligations.map((record) => record.id).sort()
    )
    expect(empty.fulfilments).toEqual({})
    expect(empty.drops).toEqual([])
  })

  it('marks the seven always-mandatory obligations mandatory on empty state', () => {
    for (const name of ENGINE_MANDATORY_ALWAYS) {
      expect(entryOf(empty, name)).toMatchObject({
        name,
        inScope: true,
        status: 'mandatory',
        fulfilled: false
      })
    }
  })

  it('defaults unregistered obligations to in scope + optional (incl. premium)', () => {
    for (const name of ['preferredName', 'phone', 'dateOfBirth', 'premium']) {
      expect(entryOf(empty, name)).toMatchObject({
        inScope: true,
        status: 'optional',
        reasons: []
      })
    }
  })

  it('keeps conditional obligations out of scope with no status and no states', () => {
    for (const name of ['excessAmount', 'driverName', 'ncdYears']) {
      const entry = entryOf(empty, name)
      expect(entry.inScope).toBe(false)
      expect(entry.status).toBeUndefined()
      expect(entry.fulfilled).toBe(false)
    }
    expect(entryOf(empty, 'claimType').fulfilments).toEqual([])
  })

  it('flips excessAmount in and out with voluntaryExcess, reasons stacked', () => {
    const withExcess = evaluateObligations(
      obligations,
      state(single('voluntaryExcess', 'yes'))
    )
    expect(entryOf(withExcess, 'excessAmount')).toMatchObject({
      inScope: true,
      status: 'mandatory'
    })
    expect(
      entryOf(withExcess, 'excessAmount').reasons.map((r) => r.code)
    ).toEqual(['scope.answered', 'mandate.excessAmount.missing'])
    const withoutExcess = evaluateObligations(
      obligations,
      state(single('voluntaryExcess', 'no'), single('excessAmount', '250'))
    )
    expect(entryOf(withoutExcess, 'excessAmount').inScope).toBe(false)
    expect(entryOf(withoutExcess, 'excessAmount').fulfilled).toBe(false)
  })
})

describe('engine/evaluate — fulfilled-ness conventions', () => {
  it('treats non-blank single values as fulfilled, blanks as not', () => {
    const evaluation = evaluateObligations(
      obligations,
      state(
        single('fullName', 'Alex Driver'),
        single('email', '   '),
        single('penaltyPoints', 0)
      )
    )
    expect(entryOf(evaluation, 'fullName').fulfilled).toBe(true)
    expect(entryOf(evaluation, 'email').fulfilled).toBe(false)
    expect(entryOf(evaluation, 'penaltyPoints').fulfilled).toBe(true)
  })

  it('counts an answered empty selection as fulfilled (extras/addons parity)', () => {
    const evaluation = evaluateObligations(
      obligations,
      state(single('extras', []), single('addons', []))
    )
    expect(entryOf(evaluation, 'extras').fulfilled).toBe(true)
    expect(entryOf(evaluation, 'addons').fulfilled).toBe(true)
  })

  it('treats an all-blank date envelope as unfulfilled, a partial one as answered', () => {
    const blank = evaluateObligations(
      obligations,
      state(single('dateOfBirth', { day: '', month: '', year: '' }))
    )
    expect(entryOf(blank, 'dateOfBirth').fulfilled).toBe(false)
    const partial = evaluateObligations(
      obligations,
      state(single('dateOfBirth', { day: '27', month: '', year: '' }))
    )
    expect(entryOf(partial, 'dateOfBirth').fulfilled).toBe(true)
  })

  it('fulfils a user-source collection on population, not per-item completeness', () => {
    const evaluation = evaluateObligations(
      obligations,
      state(single('hadClaims', 'yes'), [
        id('claimType'),
        { f1: { value: 'theft' }, f2: { value: null } }
      ])
    )
    const claimType = entryOf(evaluation, 'claimType')
    expect(claimType.fulfilled).toBe(true)
    expect(claimType.fulfilments).toEqual([
      { fulfilmentId: 'f1', fulfilled: true },
      { fulfilmentId: 'f2', fulfilled: false }
    ])
  })

  it('blocks the zero-claims case: in scope, mandatory, unfulfilled', () => {
    const evaluation = evaluateObligations(
      obligations,
      state(single('hadClaims', 'yes'))
    )
    expect(entryOf(evaluation, 'claimType')).toMatchObject({
      inScope: true,
      status: 'mandatory',
      fulfilled: false,
      fulfilments: []
    })
  })

  it('projects derived fulfilments from the controller answer, no minting', () => {
    const selected = evaluateObligations(
      obligations,
      state(single('addons', ['named-driver', 'protected-ncd']))
    )
    expect(entryOf(selected, 'driverName')).toMatchObject({
      inScope: true,
      status: 'mandatory',
      fulfilled: false,
      fulfilments: [{ fulfilmentId: 'named-driver', fulfilled: false }]
    })
    expect(entryOf(selected, 'driverDob').status).toBe('optional')
    expect(entryOf(selected, 'modDescription').inScope).toBe(false)

    const withData = evaluateObligations(
      obligations,
      state(single('addons', ['protected-ncd']), [
        id('ncdYears'),
        { 'protected-ncd': { value: '5' } }
      ])
    )
    expect(entryOf(withData, 'ncdYears')).toMatchObject({
      fulfilled: true,
      fulfilments: [{ fulfilmentId: 'protected-ncd', fulfilled: true }]
    })
  })
})

describe('engine/evaluate — amendment, determinism, purity', () => {
  it('returns the pruned set plus drops-as-data (tolerate-and-amend)', () => {
    const stored = state(single('fullName', 'Alex Driver'), [
      '00000000-0000-4000-8000-000000000000',
      { value: 'stale' }
    ])
    const evaluation = evaluateObligations(obligations, stored)
    expect(evaluation.fulfilments).toEqual(
      state(single('fullName', 'Alex Driver'))
    )
    expect(evaluation.drops).toEqual([
      {
        obligationId: '00000000-0000-4000-8000-000000000000',
        reason: 'unknown-obligation'
      }
    ])
  })

  it('is deterministic: same inputs, same output', () => {
    const stored = state(
      single('hadClaims', 'yes'),
      single('addons', ['modifications']),
      [id('claimType'), { f1: { value: 'theft' } }]
    )
    expect(evaluateObligations(obligations, stored)).toEqual(
      evaluateObligations(obligations, stored)
    )
  })

  it('never mints fulfilment ids: output ids come from storage or controllers', () => {
    const stored = state(
      single('hadClaims', 'yes'),
      single('addons', ['named-driver']),
      [id('claimType'), { f1: { value: 'theft' } }],
      [id('claimAmount'), { f1: { value: '1500' } }]
    )
    const evaluation = evaluateObligations(obligations, stored)
    const allowed = new Set(['f1', 'named-driver'])
    for (const entry of Object.values(evaluation.obligations)) {
      for (const { fulfilmentId } of entry.fulfilments ?? []) {
        expect(allowed).toContain(fulfilmentId)
      }
    }
  })

  it('does not mutate the stored fulfilments it is given', () => {
    const stored = state(single('extras', ['legal']))
    const before = structuredClone(stored)
    const evaluation = evaluateObligations(obligations, stored)
    evaluation.fulfilments[id('extras')].value.push('mutated')
    expect(stored).toEqual(before)
  })

  it('agrees with mandates.unfulfilledMandatory (the shape pin)', () => {
    const evaluation = evaluateObligations(
      obligations,
      state(single('hadClaims', 'yes'), single('fullName', 'Alex Driver'))
    )
    const gaps = unfulfilledMandatory(evaluation)
    const names = gaps.map((gap) => gap.name)
    expect(names).not.toContain('fullName')
    expect(names).toEqual(
      expect.arrayContaining([
        'email',
        'registration',
        'coverType',
        'claimType'
      ])
    )
    const claimGap = gaps.find((gap) => gap.name === 'claimType')
    expect(claimGap.reasons.map((r) => r.code)).toContain(
      'mandate.claimType.atLeastOne'
    )
  })
})
