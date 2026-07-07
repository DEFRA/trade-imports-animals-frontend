import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from './flow/dispatch.js'
import { readyForQuote } from './flow/section-status.js'
import { store } from './engine/store.js'
import { configureReadyForQuote } from './engine/read.js'
import {
  driveHandler,
  postHandlerOf,
  postHandlerEndingWith
} from './engine/test-support.js'
import { calculatePremium } from './lib/quote.js'
import { dispatchPages } from './features/index.js'

import * as vehicle from './features/your-vehicle/controller.js'
import * as cover from './features/cover-type/controller.js'
import * as modVal from './features/modifications/value.controller.js'
import * as claimsEntry from './features/claims/entry.controller.js'
import * as driverClaim from './features/named-driver/driver-claim.controller.js'

/**
 * T1 REGRESSION — currency validators strip £/commas and return the cleaned
 * digits, but the affected POST handlers were discarding that cleaned value and
 * persisting the raw hand-trimmed payload instead. These cases pin the STORED
 * value (and the one downstream numeric consequence — premium value-loading) so
 * the raw-persist behaviour cannot come back. The error path is pinned too: a
 * malformed amount must re-render the user's RAW input and commit nothing.
 */

const findPost = postHandlerEndingWith
const drive = driveHandler

describe('T1 — cleaned currency values are persisted, not the raw payload', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForQuote(readyForQuote)
  })
  beforeEach(() => store.clear())

  it('Should persist your-vehicle estimatedValue with £ and commas stripped', () => {
    const { after } = drive(postHandlerOf(vehicle), {
      payload: { estimatedValue: '£9,000' }
    })
    expect(after.estimatedValue).toBe('9000')
  })

  it('Should feed the cleaned estimatedValue into the premium value-loading', () => {
    const { after } = drive(postHandlerOf(vehicle), {
      payload: { estimatedValue: '£9,000' }
    })
    // Cleaned '9000' → valueLoading round(9000 * 0.01) = 90 → base 480 + 90 = 570.
    // Raw '£9,000' → Number(...) NaN → loading 0 → 480 (the underpriced bug).
    expect(calculatePremium(after)).toBe(570)
    expect(calculatePremium(after)).not.toBe(
      calculatePremium({ estimatedValue: '£9,000' })
    )
  })

  it('Should persist cover-type excessAmount with £ and commas stripped', () => {
    const { after } = drive(postHandlerOf(cover), {
      payload: {
        coverType: 'comprehensive',
        voluntaryExcess: 'yes',
        excessAmount: '£1,234'
      }
    })
    expect(after.excessAmount).toBe('1234')
  })

  it('Should persist modifications modValue with £ and commas stripped', () => {
    const { after } = drive(postHandlerOf(modVal), {
      seed: { addons: ['modifications'] },
      payload: { modValue: '£1,500' }
    })
    expect(after.modValue).toBe('1500')
  })

  it('Should persist a top-level claim claimAmount with £ stripped', () => {
    const { after } = drive(findPost(claimsEntry, 'claims/add'), {
      seed: { hadClaims: 'yes' },
      payload: { claimType: 'accident', claimAmount: '£500' }
    })
    expect(after.claims[0].claimAmount).toBe('500')
  })

  it('Should persist a nested driver claim claimAmount with £ stripped', () => {
    const { after } = drive(findPost(driverClaim, 'claims/add'), {
      seed: {
        addons: ['named-driver'],
        drivers: [{ driverName: 'Sam Passenger', relationship: 'spouse' }]
      },
      params: { driver: '0' },
      payload: { claimType: 'accident', claimAmount: '£750' }
    })
    expect(after.drivers[0].claims[0].claimAmount).toBe('750')
  })
})

describe('T1 — error path still echoes the raw input and commits nothing', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForQuote(readyForQuote)
  })
  beforeEach(() => store.clear())

  it('Should re-render cover-type with the raw malformed amount and no commit', () => {
    const { after, view } = drive(postHandlerOf(cover), {
      payload: {
        coverType: 'comprehensive',
        voluntaryExcess: 'yes',
        excessAmount: '£1,2x4'
      }
    })
    expect(view.ctx.values.excessAmount).toBe('£1,2x4')
    expect(view.ctx.errors).toHaveProperty('excessAmount')
    expect(after.excessAmount).toBeUndefined()
  })

  it('Should re-render your-vehicle with the raw malformed amount and no commit', () => {
    const { after, view } = drive(postHandlerOf(vehicle), {
      payload: { estimatedValue: '£9,00x' }
    })
    expect(view.ctx.values.estimatedValue).toBe('£9,00x')
    expect(view.ctx.errors).toHaveProperty('estimatedValue')
    expect(after.estimatedValue).toBeUndefined()
  })
})
