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
import { dispatchPages } from './features/index.js'

import * as cover from './features/cover-type/controller.js'
import * as modVal from './features/modifications/value.controller.js'
import * as claimsEntry from './features/claims/entry.controller.js'
import * as driverClaim from './features/named-driver/driver-claim.controller.js'

/**
 * Handlers must persist the validator's cleaned value, not the raw payload;
 * the error path must echo the RAW input and commit nothing.
 */

const findPost = postHandlerEndingWith
const drive = driveHandler

describe('T1 — cleaned currency values are persisted, not the raw payload', () => {
  beforeAll(() => {
    buildDispatch(dispatchPages)
    configureReadyForQuote(readyForQuote)
  })
  beforeEach(() => store.clear())

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
    expect(view.context.values.excessAmount).toBe('£1,2x4')
    expect(view.context.errors).toHaveProperty('excessAmount')
    expect(after.excessAmount).toBeUndefined()
  })
})
