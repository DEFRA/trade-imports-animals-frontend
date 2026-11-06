import { describe, expect, it } from 'vitest'

import {
  isRemoveAction,
  removeActionFor,
  removeKeyOf
} from './remove-action.js'

const KEY = '0102|Bos taurus'

describe('#removeActionFor', () => {
  it('Should prefix the key with the remove action marker', () => {
    expect(removeActionFor(KEY)).toBe(`remove:${KEY}`)
  })
})

describe('#isRemoveAction', () => {
  it('Should recognise a removal action value', () => {
    expect(isRemoveAction(`remove:${KEY}`)).toBe(true)
  })

  it('Should not recognise the search or clear action values', () => {
    expect(isRemoveAction('search')).toBe(false)
    expect(isRemoveAction('clear')).toBe(false)
  })
})

describe('#removeKeyOf', () => {
  it('Should read the key back out of a removal action value', () => {
    expect(removeKeyOf(`remove:${KEY}`)).toBe(KEY)
  })
})
