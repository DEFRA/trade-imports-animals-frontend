import { describe, expect, it } from 'vitest'

import {
  REMOVE_ACTION_PREFIX,
  isRemoveAction,
  removeActionValue,
  removeIndexOf
} from './remove-action.js'

describe('plant-products documents remove action', () => {
  it('parses back whatever it rendered, whichever prefix the contract names', () => {
    expect(removeIndexOf(removeActionValue(3))).toBe(3)
    expect(removeIndexOf(removeActionValue(0))).toBe(0)
    expect(isRemoveAction(removeActionValue(3))).toBe(true)
  })

  it('refuses a leading-zero, fractional or unanchored index', () => {
    expect(removeIndexOf(`${REMOVE_ACTION_PREFIX}01`)).toBeNull()
    expect(removeIndexOf(`${REMOVE_ACTION_PREFIX}1.5`)).toBeNull()
    expect(removeIndexOf(`${REMOVE_ACTION_PREFIX}not-a-number`)).toBeNull()
    expect(removeIndexOf(` ${REMOVE_ACTION_PREFIX}1`)).toBeNull()
    expect(removeIndexOf(`${REMOVE_ACTION_PREFIX}1 `)).toBeNull()
  })
})
