import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  createScopeRegistry,
  evaluateObligations,
  pruneFulfilments,
  reason
} from '../engine/index.js'

/**
 * Tier 5 — the flagship dual-identifier proof (SHAPE-6, PERSIST-24):
 * storage keys on committed UUID ids, code binds to meaningful names, so
 * a cosmetic rename (new `name`, same `id`) never touches persisted
 * fulfilments. The contrast case — deleting the record — prunes with a
 * logged drop; pruning is idempotent; a rename that collides with an
 * existing name is rejected at the identifier boundary.
 */

const modelDir = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'model'
)
const catalogue = () =>
  JSON.parse(fs.readFileSync(path.join(modelDir, 'obligations.json'), 'utf8'))
    .obligations

const recordOf = (obligations, name) =>
  obligations.find((record) => record.name === name)

const FULL_NAME_ID = recordOf(catalogue(), 'fullName').id
const EMAIL_ID = recordOf(catalogue(), 'email').id

const stored = () => ({
  [FULL_NAME_ID]: { value: 'Sam Farrington' },
  [EMAIL_ID]: { value: 'sam@example.com' }
})

const renamed = (to) =>
  catalogue().map((record) =>
    record.name === 'fullName' ? { ...record, name: to } : record
  )

describe('tests/rename-survival — the dual-identifier proof', () => {
  it('keeps every fulfilment through a rename: same UUID, new name', () => {
    const { fulfilments, drops } = pruneFulfilments(
      renamed('legalName'),
      stored()
    )
    expect(drops).toEqual([])
    expect(fulfilments).toEqual(stored())
  })

  it('evaluates the stored value under the new name, untouched', () => {
    const result = evaluateObligations(renamed('legalName'), stored())
    const entry = result.obligations[FULL_NAME_ID]
    expect(entry.name).toBe('legalName')
    expect(entry.fulfilled).toBe(true)
    expect(result.fulfilments[FULL_NAME_ID]).toEqual({
      value: 'Sam Farrington'
    })
  })

  it('rebinds the mandate in code only: re-register under the new name', () => {
    // Scope rules author against names, so a rename is a one-line code
    // change at the registry — storage stays untouched either way.
    const registry = createScopeRegistry()
    registry.register('legalName', 'alwaysRequired', () => ({
      status: 'mandatory',
      reasons: [reason('mandate.fullName.missing')]
    }))
    const result = evaluateObligations(renamed('legalName'), stored(), {
      scopeRegistry: registry
    })
    expect(result.obligations[FULL_NAME_ID].status).toBe('mandatory')
    expect(result.obligations[FULL_NAME_ID].fulfilled).toBe(true)
  })

  it('contrast: deleting the record prunes its data with a logged drop', () => {
    const without = catalogue().filter((record) => record.id !== FULL_NAME_ID)
    const { fulfilments, drops } = pruneFulfilments(without, stored())
    expect(drops).toEqual([
      { obligationId: FULL_NAME_ID, reason: 'unknown-obligation' }
    ])
    expect(fulfilments[FULL_NAME_ID]).toBeUndefined()
    expect(fulfilments[EMAIL_ID]).toEqual({ value: 'sam@example.com' })
  })

  it('prunes idempotently: pruning pruned output drops nothing', () => {
    const without = catalogue().filter((record) => record.id !== FULL_NAME_ID)
    const first = pruneFulfilments(without, stored())
    const second = pruneFulfilments(without, first.fulfilments)
    expect(second.drops).toEqual([])
    expect(second.fulfilments).toEqual(first.fulfilments)
  })

  it('rejects a rename that collides with an existing name', () => {
    expect(() => evaluateObligations(renamed('email'), stored())).toThrow(
      /Duplicate obligation name "email"/
    )
  })

  it('survives an indexed rename too: claim rows keep their minted ids', () => {
    const obligations = catalogue().map((record) =>
      record.name === 'claimType' ? { ...record, name: 'incidentType' } : record
    )
    const claims = {
      [recordOf(obligations, 'incidentType').id]: {
        'claim-1': { value: 'accident' }
      }
    }
    const result = evaluateObligations(obligations, claims)
    const entry = result.obligations[recordOf(obligations, 'incidentType').id]
    expect(entry.name).toBe('incidentType')
    expect(entry.fulfilments).toEqual([
      { fulfilmentId: 'claim-1', fulfilled: true }
    ])
  })
})
