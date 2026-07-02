import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  ENGINE_MANDATORY_ALWAYS,
  loadJourneyModel,
  unfulfilledMandatory
} from '../engine/index.js'
import { FULFILLED, journeyState } from '../flow-eval/index.js'
import { runToFixedPoint } from '../orchestrator/index.js'
import {
  enumerateStates,
  satisfyingValueFor
} from './helpers/enumerate-states.js'

/**
 * Tier 3 — bounded-enumeration completability and dead-mandate detection
 * (TEST-3/13/14, TEST-X1_1, FLOW-13, EVAL-37) over the full controlling-
 * dimension state space (162 states, see helpers/enumerate-states.js).
 * From EVERY state, filling every reported engine-mandatory gap with a
 * canonical value must reach journeyState Fulfilled — no state is a dead
 * end, and no mandate can be triggered that cannot then be satisfied.
 */

const { obligations, identifiers } = loadJourneyModel()
const flow = JSON.parse(
  fs.readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'model',
      'flow.json'
    ),
    'utf8'
  )
)
const states = enumerateStates()

const writeGap = (fulfilments, gap) => {
  const record = identifiers.recordOfName(gap.name)
  const value = satisfyingValueFor(record)
  if (record.cardinality === 'single') {
    fulfilments[record.id] = { value }
  } else if (record.indexedBy.source === 'user') {
    // The zero-rows collection gap: give it one row (the claims loop).
    fulfilments[record.id] = { 'filled-claim': { value } }
  } else {
    fulfilments[record.id] = {
      ...(fulfilments[record.id] ?? {}),
      [record.indexedBy.controllingValue]: { value }
    }
  }
}

/** Fill mandatory gaps until none remain; throws if that never happens. */
const fillToCompletion = (fulfilments) => {
  let current = structuredClone(fulfilments)
  for (let round = 0; round < 6; round++) {
    const outcome = runToFixedPoint(obligations, current)
    const gaps = unfulfilledMandatory(outcome.evaluation)
    if (gaps.length === 0) {
      return outcome
    }
    current = outcome.fulfilments
    gaps.forEach((gap) => writeGap(current, gap))
  }
  throw new Error('Filling mandatory gaps did not converge in 6 rounds')
}

describe('tests/completability — bounded enumeration (162 states)', () => {
  it('enumerates the bounded space the tier promises', () => {
    expect(states.length).toBe(162)
    expect(states.length).toBeLessThan(500)
  })

  it('completes the journey from every enumerated state', () => {
    for (const state of states) {
      const outcome = fillToCompletion(state.fulfilments)
      expect(
        journeyState(flow, outcome.evaluation),
        `state ${state.label}`
      ).toBe(FULFILLED)
      expect(unfulfilledMandatory(outcome.evaluation)).toEqual([])
    }
  })

  it('closes the wipe: one fixed-point pass is idempotent for every state', () => {
    for (const state of states) {
      const first = runToFixedPoint(obligations, state.fulfilments)
      const second = runToFixedPoint(obligations, first.fulfilments)
      expect(second.fulfilments, `state ${state.label}`).toEqual(
        first.fulfilments
      )
      if (!state.coherent) {
        // Incoherent claims (present without hadClaims yes) are wiped.
        expect(first.fulfilments[identifiers.idOf('claimType')]).toBeUndefined()
      }
    }
  })

  it('holds the EvaluationResult shape invariant across every state', () => {
    for (const state of states) {
      const { evaluation } = runToFixedPoint(obligations, state.fulfilments)
      for (const [obligationId, entry] of Object.entries(
        evaluation.obligations
      )) {
        const record = identifiers.recordOfId(obligationId)
        expect(typeof entry.name).toBe('string')
        expect(typeof entry.inScope).toBe('boolean')
        expect(typeof entry.fulfilled).toBe('boolean')
        expect(Array.isArray(entry.reasons)).toBe(true)
        if (entry.inScope) {
          expect(['mandatory', 'optional']).toContain(entry.status)
        }
        if (record.cardinality === 'indexed') {
          expect(Array.isArray(entry.fulfilments)).toBe(true)
        } else {
          expect(entry.fulfilments).toBeUndefined()
        }
      }
    }
  })

  it('detects dead mandates: every authored mandate fires somewhere', () => {
    const observedMandatory = new Set()
    for (const state of states) {
      const { evaluation } = runToFixedPoint(obligations, state.fulfilments)
      for (const entry of Object.values(evaluation.obligations)) {
        if (entry.inScope && entry.status === 'mandatory') {
          observedMandatory.add(entry.name)
        }
      }
    }
    const authored = [
      ...ENGINE_MANDATORY_ALWAYS,
      'excessAmount',
      'claimType',
      'driverName',
      'relationship',
      'modDescription',
      'modValue',
      'ncdYears'
    ].sort()
    expect([...observedMandatory].sort()).toEqual(authored)
    // The two deliberately optional companions never fire mandatory.
    expect(observedMandatory.has('claimAmount')).toBe(false)
    expect(observedMandatory.has('driverDob')).toBe(false)
  })
})
