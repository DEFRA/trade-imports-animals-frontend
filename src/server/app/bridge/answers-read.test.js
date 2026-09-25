/**
 * The answers-for-read seam, with two sets mounted.
 *
 * It is the one seam that answers for an unconfigured set rather than throwing:
 * a set that configures no sanitiser reads its answers unchanged. Proving that
 * needs a second set that is deliberately left unconfigured, because with one
 * set mounted the identity fallback and a bare `store.current()` behave alike.
 */
import { beforeAll, describe, expect, it } from 'vitest'

import { answersForRead, configureAnswersForRead } from './answers-read.js'
import { registerSetMount, withSetContext } from '../shared/set-context.js'
import { SET_ID as LIVE_ANIMALS } from '../sets/live-animals/set.js'

const UNCONFIGURED_SET = 'answers-read-probe'
const REQUEST = { path: '/anywhere' }
const ANSWERS = Object.freeze({
  countryOfOrigin: 'FR',
  consignor: { addressId: 'deleted-address' }
})

const sanitized = { countryOfOrigin: 'FR', consignor: null }

beforeAll(() => {
  registerSetMount(UNCONFIGURED_SET, `/${UNCONFIGURED_SET}`)
  // Only live-animals gets a sanitiser. The other set is left unconfigured on
  // purpose — that is the case under test.
  configureAnswersForRead(LIVE_ANIMALS, async () => sanitized)
})

describe('#answersForRead', () => {
  it('Should apply the configured set’s own sanitiser', async () => {
    const result = await withSetContext(LIVE_ANIMALS, () =>
      answersForRead(REQUEST, ANSWERS)
    )

    expect(result).toEqual(sanitized)
  })

  it('Should read a set that configures no sanitiser unchanged', async () => {
    const result = await withSetContext(UNCONFIGURED_SET, () =>
      answersForRead(REQUEST, ANSWERS)
    )

    expect(result).toEqual(ANSWERS)
    expect(result).not.toEqual(sanitized)
  })
})
