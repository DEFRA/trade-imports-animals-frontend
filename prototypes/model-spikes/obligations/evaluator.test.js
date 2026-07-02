import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import { evaluateObligations } from './evaluator.js'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const obligations = JSON.parse(
  fs.readFileSync(path.join(dirname, 'obligations.json'), 'utf8')
)

const fullNameId = obligations.find((o) => o.name === 'fullName').id
const dateOfBirthId = obligations.find((o) => o.name === 'dateOfBirth').id

const mandatoryInScope = { inScope: true, status: 'mandatory' }

describe('evaluateObligations — iteration 1', () => {
  it('empty fulfilments → both obligations in-scope-mandatory; amended empty', () => {
    const result = evaluateObligations(obligations, {})

    expect(result.fulfilments).toEqual({})
    expect(result.obligations).toEqual({
      [fullNameId]: mandatoryInScope,
      [dateOfBirthId]: mandatoryInScope
    })
  })

  it('both fulfilments present → obligation state unchanged; amended equals input', () => {
    const fulfilments = {
      [fullNameId]: 'Alex Driver',
      [dateOfBirthId]: '1985-03-27'
    }

    const result = evaluateObligations(obligations, fulfilments)

    expect(result.fulfilments).toEqual(fulfilments)
    expect(result.obligations).toEqual({
      [fullNameId]: mandatoryInScope,
      [dateOfBirthId]: mandatoryInScope
    })
  })

  it('one fulfilment present → obligation state unchanged; amended contains only that one', () => {
    const fulfilments = { [fullNameId]: 'Alex Driver' }

    const result = evaluateObligations(obligations, fulfilments)

    expect(result.fulfilments).toEqual({ [fullNameId]: 'Alex Driver' })
    expect(result.obligations).toEqual({
      [fullNameId]: mandatoryInScope,
      [dateOfBirthId]: mandatoryInScope
    })
  })

  it('unknown fulfilment id → dropped from amended; obligation state unchanged', () => {
    const fulfilments = {
      [fullNameId]: 'Alex Driver',
      'unknown-obligation-id': 'stray value'
    }

    const result = evaluateObligations(obligations, fulfilments)

    expect(result.fulfilments).toEqual({ [fullNameId]: 'Alex Driver' })
    expect(result.obligations).toEqual({
      [fullNameId]: mandatoryInScope,
      [dateOfBirthId]: mandatoryInScope
    })
  })

  it('fulfilments are keyed by stable id, not by name → name-keyed entries are dropped by tolerate-and-amend', () => {
    // Doc's readability convention shows outer keys as `name` values in
    // examples; real storage / real code uses `id` (see §Persistence →
    // Obligation identifiers). Verify: id-keyed entries pass through;
    // name-keyed entries are treated as unknown and dropped.
    const fulfilments = {
      [fullNameId]: 'Alex Driver', // keyed by id — passes through
      dateOfBirth: '1985-03-27' // keyed by name — dropped
    }

    const result = evaluateObligations(obligations, fulfilments)

    expect(result.fulfilments).toEqual({ [fullNameId]: 'Alex Driver' })
  })

  it('empty obligations model → amended empty regardless of input; obligation state empty', () => {
    const result = evaluateObligations([], {
      [fullNameId]: 'Alex Driver',
      [dateOfBirthId]: '1985-03-27'
    })

    expect(result.fulfilments).toEqual({})
    expect(result.obligations).toEqual({})
  })

  it('idempotent → calling twice yields structurally equal outputs', () => {
    const fulfilments = {
      [fullNameId]: 'Alex Driver',
      [dateOfBirthId]: '1985-03-27'
    }

    const first = evaluateObligations(obligations, fulfilments)
    const second = evaluateObligations(obligations, fulfilments)

    expect(second).toEqual(first)
  })
})
