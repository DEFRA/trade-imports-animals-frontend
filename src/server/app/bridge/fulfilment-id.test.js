import { describe, expect, it } from 'vitest'

import {
  FULFILMENT_ID_DELIMITER,
  INSTANCE_ID_DELIMITER,
  formatCompositeFulfilmentId,
  parseCompositeFulfilmentId
} from './fulfilment-id.js'

const OBLIGATION_ID = '9ad1e2f3-a4b5-4c60-8d1c-9e0f1a2b3c4d'
const INSTANCE_ID = 'line0.unit1'

describe('delimiter constants', () => {
  it('separate the two composite ids with distinct RFC 3986 unreserved characters', () => {
    expect(INSTANCE_ID_DELIMITER).toBe('.')
    expect(FULFILMENT_ID_DELIMITER).toBe(':')
  })
})

describe('formatCompositeFulfilmentId', () => {
  it('returns <obligationId>:<instanceId> when an instance id is supplied', () => {
    expect(formatCompositeFulfilmentId(OBLIGATION_ID, INSTANCE_ID)).toBe(
      `${OBLIGATION_ID}:${INSTANCE_ID}`
    )
  })

  it('returns just the obligation id when the fulfilment is scalar', () => {
    expect(formatCompositeFulfilmentId(OBLIGATION_ID, null)).toBe(OBLIGATION_ID)
    expect(formatCompositeFulfilmentId(OBLIGATION_ID, '')).toBe(OBLIGATION_ID)
  })
})

describe('parseCompositeFulfilmentId', () => {
  it('splits <obligationId>:<instanceId> into its two parts', () => {
    expect(
      parseCompositeFulfilmentId(`${OBLIGATION_ID}:${INSTANCE_ID}`)
    ).toEqual({
      obligationId: OBLIGATION_ID,
      instanceId: INSTANCE_ID
    })
  })

  it('returns a null instance id for a scalar (no `:`) composite', () => {
    expect(parseCompositeFulfilmentId(OBLIGATION_ID)).toEqual({
      obligationId: OBLIGATION_ID,
      instanceId: null
    })
  })

  it('round-trips with formatCompositeFulfilmentId', () => {
    const composite = formatCompositeFulfilmentId(OBLIGATION_ID, INSTANCE_ID)
    const parsed = parseCompositeFulfilmentId(composite)
    expect(
      formatCompositeFulfilmentId(parsed.obligationId, parsed.instanceId)
    ).toBe(composite)
  })

  it('splits at the first `:` only, so an instance id containing `:` survives if a future format ever allows it', () => {
    // Defensive: today the FIELD_UNSAFE regex forbids `:` in a field, so an
    // instance id can never contain one. This assertion documents the split
    // behaviour anyway so the invariant is explicit in the test suite.
    expect(
      parseCompositeFulfilmentId(`${OBLIGATION_ID}:${INSTANCE_ID}:extra`)
    ).toEqual({
      obligationId: OBLIGATION_ID,
      instanceId: `${INSTANCE_ID}:extra`
    })
  })
})
