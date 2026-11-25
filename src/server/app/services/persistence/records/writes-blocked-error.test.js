import { describe, expect, it } from 'vitest'
import { SUBMITTED } from '../../../engine/persistence/records.js'
import { writesBlockedError } from './writes-blocked-error.js'

describe('#writesBlockedError', () => {
  it('Should name the status of the journey whose writes are blocked', () => {
    expect(writesBlockedError('j-1', SUBMITTED).message).toBe(
      'Journey "j-1" is submitted — writes blocked'
    )
  })
})
