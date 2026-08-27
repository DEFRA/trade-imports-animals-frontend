import { describe, expect, it } from 'vitest'

import {
  FULFILMENT_ID_DELIMITER,
  INDEX_DELIMITER,
  formatCompositeFulfilmentId,
  parseCompositeFulfilmentId
} from './fulfilment-id.js'

const OBLIGATION_ID = '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
const INDEX = 'line0.unit1'

describe('delimiter constants', () => {
  it('separate the obligationId from the index and the index segments from each other with distinct RFC 3986 unreserved characters', () => {
    expect(INDEX_DELIMITER).toBe('.')
    expect(FULFILMENT_ID_DELIMITER).toBe(':')
  })
})

describe('formatCompositeFulfilmentId', () => {
  it('returns <obligationId>:<index> when an index is supplied', () => {
    expect(formatCompositeFulfilmentId(OBLIGATION_ID, INDEX)).toBe(
      `${OBLIGATION_ID}:${INDEX}`
    )
  })

  it('returns just the obligation id when the fulfilment is scalar', () => {
    expect(formatCompositeFulfilmentId(OBLIGATION_ID, null)).toBe(OBLIGATION_ID)
    expect(formatCompositeFulfilmentId(OBLIGATION_ID, '')).toBe(OBLIGATION_ID)
  })
})

describe('parseCompositeFulfilmentId', () => {
  it('splits <obligationId>:<index> into its two parts', () => {
    expect(parseCompositeFulfilmentId(`${OBLIGATION_ID}:${INDEX}`)).toEqual({
      obligationId: OBLIGATION_ID,
      index: INDEX
    })
  })

  it('returns a null index for a scalar (no `:`) composite', () => {
    expect(parseCompositeFulfilmentId(OBLIGATION_ID)).toEqual({
      obligationId: OBLIGATION_ID,
      index: null
    })
  })

  it('round-trips with formatCompositeFulfilmentId', () => {
    const composite = formatCompositeFulfilmentId(OBLIGATION_ID, INDEX)
    const parsed = parseCompositeFulfilmentId(composite)
    expect(formatCompositeFulfilmentId(parsed.obligationId, parsed.index)).toBe(
      composite
    )
  })

  it('splits at the first `:` only, so an index containing `:` survives if a future format ever allows it', () => {
    // Defensive: today the FIELD_UNSAFE regex forbids `:` in a field, so an
    // index can never contain one. This assertion documents the split
    // behaviour anyway so the invariant is explicit in the test suite.
    expect(
      parseCompositeFulfilmentId(`${OBLIGATION_ID}:${INDEX}:extra`)
    ).toEqual({
      obligationId: OBLIGATION_ID,
      index: `${INDEX}:extra`
    })
  })
})
