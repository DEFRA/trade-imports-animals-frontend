/**
 * repl-obligations.test.js — pin the command handlers of the REPL.
 *
 * The REPL wrapper is a thin readline loop; the command handlers are
 * pure functions of `(session, args) -> { session, output }`. Testing
 * the handlers directly avoids subprocess spawning while still covering
 * the behaviour a stakeholder actually sees at the prompt.
 *
 * Coverage focuses on the three claims the task brief calls out:
 *   1. `set` parses value as JSON with a bare-token fallback.
 *   2. `explain` returns the right dependsOn chain for a known
 *      obligation (regionCode → regionCodeRequirement → seed).
 *   3. `witness` returns a value that, when set + evaluated, opens the
 *      gate (round-trip fidelity — Phase 3.2 pattern).
 */

import { describe, it, expect } from 'vitest'
import {
  createSession,
  dispatch,
  parseValue,
  handleSet,
  handleExplain,
  handleWitness
} from './repl-obligations.js'
import { evaluateState } from './contract.js'
import { obligations as v4Obligations } from './obligations/obligations.js'

const OBLIGATIONS_BY_NAME = new Map(v4Obligations.map((o) => [o.name, o]))

const resolveFulfilments = (named) => {
  const out = {}
  for (const [name, value] of Object.entries(named)) {
    out[OBLIGATIONS_BY_NAME.get(name).id] = value
  }
  return out
}

describe('parseValue — JSON first, bare-token fallback', () => {
  it('parses a JSON string literal', () => {
    expect(parseValue('"sale"')).toBe('sale')
  })

  it('parses a JSON number', () => {
    expect(parseValue('25')).toBe(25)
  })

  it('parses a JSON array', () => {
    expect(parseValue('["cattle"]')).toEqual(['cattle'])
  })

  it('falls back to a bare string when JSON.parse throws', () => {
    // Leading-zero commodity code — not valid JSON, must survive as
    // the string "0101" so the evaluator's allow-list check matches.
    expect(parseValue('0101')).toBe('0101')
  })

  it('falls back to a bare string for a plain word', () => {
    expect(parseValue('yes')).toBe('yes')
  })
})

describe('handleSet — top-level obligations', () => {
  it('sets a scalar via JSON parsing', () => {
    const { session, output } = handleSet(createSession(), [
      'reasonForImport',
      '"sale"'
    ])
    expect(session.fulfilments.reasonForImport).toBe('sale')
    expect(output).toContain('set reasonForImport')
  })

  it('sets a scalar via bare-token fallback', () => {
    const { session } = handleSet(createSession(), ['reasonForImport', 'sale'])
    expect(session.fulfilments.reasonForImport).toBe('sale')
  })

  it('rejects an unknown obligation without crashing', () => {
    const { session, output } = handleSet(createSession(), ['nope', 'x'])
    expect(session.fulfilments).toEqual({})
    expect(output).toContain('unknown obligation')
  })
})

describe('handleSet — group-scoped obligations', () => {
  it('sets a per-record value with the leading-zero commodity code', () => {
    const { session } = handleSet(createSession(), [
      'commodityCode',
      'line1',
      '0101'
    ])
    expect(session.fulfilments.commodityCode).toEqual({ line1: '0101' })
  })

  it('preserves other records when adding another line', () => {
    const step1 = handleSet(createSession(), ['commodityCode', 'line1', '0101'])
    const step2 = handleSet(step1.session, ['commodityCode', 'line2', '0102'])
    expect(step2.session.fulfilments.commodityCode).toEqual({
      line1: '0101',
      line2: '0102'
    })
  })

  it('rejects a group-scoped obligation without a recordId', () => {
    const { session, output } = handleSet(createSession(), [
      'commodityCode',
      '0101'
    ])
    expect(session.fulfilments).toEqual({})
    expect(output).toContain('scoped within')
  })
})

describe('handleExplain — dependsOn chain', () => {
  it('reports regionCode as gated on regionCodeRequirement', () => {
    const { output } = handleExplain(createSession(), ['regionCode'])
    expect(output).toContain('obligation:   regionCode')
    expect(output).toContain('helper type:  equalsGate')
    expect(output).toContain('dependsOn chain:')
    expect(output).toContain('regionCodeRequirement')
    // regionCodeRequirement is a seed obligation — the chain must
    // terminate there.
    expect(output).toContain('(no dependencies — always in scope)')
  })

  it('reports a top-level always-in-scope obligation as chain-free', () => {
    const { output } = handleExplain(createSession(), ['countryOfOrigin'])
    expect(output).toContain('(no dependencies — always in scope)')
  })

  it('reports unknown obligation without crashing', () => {
    const { output } = handleExplain(createSession(), ['nope'])
    expect(output).toContain('unknown obligation')
  })
})

describe('handleWitness — round-trip fidelity', () => {
  it('produces a value that (once set + evaluated) opens the gate', () => {
    // purposeInInternalMarket is gated by reasonForImport === 'internal-market'.
    // synthesiseWitness returns { obligationId: reasonForImport.id, value: 'internal-market' }.
    // The REPL formats that as "set reasonForImport <value>" — feeding
    // that back through the pipeline must show purposeInInternalMarket
    // in scope. This is the same fidelity check Phase 3.2 pins on the
    // prover, staged through the REPL's set + evaluate seam.
    const gated = OBLIGATIONS_BY_NAME.get('purposeInInternalMarket')
    const witnessResult = handleWitness(createSession(), [
      'purposeInInternalMarket'
    ])
    expect(witnessResult.output).toContain('WITNESS')
    expect(witnessResult.output).toContain('gate obligation: reasonForImport')
    expect(witnessResult.output).toContain('"internal-market"')

    // Now drive the round-trip via `set` and confirm the gate opens.
    const setResult = handleSet(createSession(), [
      'reasonForImport',
      '"internal-market"'
    ])
    const state = evaluateState(
      resolveFulfilments(setResult.session.fulfilments)
    )
    expect(state.obligations[gated.id].inScope).toBe(true)
    expect(state.obligations[gated.id].status).toBe('mandatory')
  })

  it('classifies a total-branches gate as TRIVIAL', () => {
    // regionCode is an equalsGate with both branches in-scope (status-
    // swap). No witness needed — every input opens the gate. The
    // WITNESS_KIND coverage assertion pins this shape.
    const { output } = handleWitness(createSession(), ['regionCode'])
    expect(output).toContain('TRIVIAL')
  })

  it('classifies a plain always-in-scope obligation as TRIVIAL', () => {
    // countryOfOrigin has no applyTo — the classifier collapses it to
    // TRIVIAL (structural / always-open) in the same way the prover does.
    const { output } = handleWitness(createSession(), ['countryOfOrigin'])
    expect(output).toContain('TRIVIAL')
  })
})

describe('dispatch — end-to-end command routing', () => {
  it('routes an unknown command without crashing', () => {
    const { output } = dispatch(createSession(), 'wibble')
    expect(output).toContain('unknown command')
  })

  it('treats a blank line as a no-op', () => {
    const result = dispatch(createSession(), '   ')
    expect(result.output).toBeNull()
  })

  it('exits when asked', () => {
    const result = dispatch(createSession(), 'exit')
    expect(result.done).toBe(true)
  })

  it('loads a fixture through dispatch', () => {
    const { session, output } = dispatch(createSession(), 'fixture empty')
    expect(session.fulfilments).toEqual({})
    expect(output).toContain("loaded fixture 'empty'")
  })

  it('reports reach as 44/0/0 on the real manifest', () => {
    const { output } = dispatch(createSession(), 'reach')
    expect(output).toContain(`reachable:   ${v4Obligations.length}`)
    expect(output).toContain('unreachable: 0')
    expect(output).toContain('errors:      0')
  })
})
