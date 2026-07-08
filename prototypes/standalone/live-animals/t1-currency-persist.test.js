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

import * as modVal from './features/modifications/value.controller.js'
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

  it('Should persist modifications modValue with £ and commas stripped', () => {
    const { after } = drive(postHandlerOf(modVal), {
      seed: { addons: ['modifications'] },
      payload: { modValue: '£1,500' }
    })
    expect(after.modValue).toBe('1500')
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

  it('Should re-render modifications-value with the raw malformed amount and no commit', () => {
    const { after, view } = drive(postHandlerOf(modVal), {
      seed: { addons: ['modifications'] },
      payload: { modValue: '£1,5x0' }
    })
    expect(view.context.value).toBe('£1,5x0')
    expect(view.context.errors).toHaveProperty('modValue')
    expect(after.modValue).toBeUndefined()
  })
})
