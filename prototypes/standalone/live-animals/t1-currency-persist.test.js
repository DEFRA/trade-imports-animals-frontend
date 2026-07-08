import { beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { buildDispatch } from './flow/dispatch.js'
import { readyForQuote } from './flow/section-status.js'
import { store } from './engine/store.js'
import { configureReadyForQuote } from './engine/read.js'
import { driveHandler, postHandlerOf } from './engine/test-support.js'
import { dispatchPages } from './features/index.js'

import * as modVal from './features/modifications/value.controller.js'

/**
 * Handlers must persist the validator's cleaned value, not the raw payload;
 * the error path must echo the RAW input and commit nothing.
 */

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
