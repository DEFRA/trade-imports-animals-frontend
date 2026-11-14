import { describe, expect, it } from 'vitest'
import { SUBMITTED_ACTION_REQUIRED } from '../../../engine/persistence/records.js'
import { writesBlockedError } from './writes-blocked-error.js'

describe('#writesBlockedError', () => {
  it('Should read "is submitted" for a Submitted action required journey', () => {
    expect(writesBlockedError('j-1', SUBMITTED_ACTION_REQUIRED).message).toBe(
      'Journey "j-1" is submitted — writes blocked'
    )
  })
})
