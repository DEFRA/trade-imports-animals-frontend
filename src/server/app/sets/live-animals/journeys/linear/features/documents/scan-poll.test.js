import { describe, expect, it } from 'vitest'

import {
  MAX_POLL_ATTEMPTS,
  POLL_ACTION,
  POLL_INTERVAL_MS,
  hasSettled,
  pollDecision
} from './scan-poll.js'

const pending = { uploadId: 'U1', scanStatus: 'PENDING' }
const complete = { uploadId: 'U2', scanStatus: 'COMPLETE' }
const rejected = { uploadId: 'U3', scanStatus: 'REJECTED' }

describe('#hasSettled', () => {
  it('Should call a batch settled once nothing is still being scanned', () => {
    expect(hasSettled([complete, rejected])).toBe(true)
    expect(hasSettled([])).toBe(true)
  })

  it('Should call a batch unsettled while any document is still being scanned', () => {
    expect(hasSettled([complete, pending])).toBe(false)
  })

  it('Should call an unreadable batch unsettled', () => {
    expect(hasSettled(null)).toBe(false)
  })
})

describe('#pollDecision', () => {
  it('Should settle as soon as every scan has finished, whatever the outcome', () => {
    expect(pollDecision({ attempt: 0, documents: [complete] })).toEqual({
      action: POLL_ACTION.settled
    })
    expect(pollDecision({ attempt: 4, documents: [rejected] })).toEqual({
      action: POLL_ACTION.settled
    })
  })

  it('Should schedule the next attempt three seconds on while a scan is pending', () => {
    expect(pollDecision({ attempt: 0, documents: [pending] })).toEqual({
      action: POLL_ACTION.retry,
      attempt: 1,
      delayMs: POLL_INTERVAL_MS
    })
    expect(POLL_INTERVAL_MS).toBe(3000)
  })

  it('Should retry a failed fetch rather than treating it as settled', () => {
    expect(pollDecision({ attempt: 2, documents: null })).toEqual({
      action: POLL_ACTION.retry,
      attempt: 3,
      delayMs: POLL_INTERVAL_MS
    })
  })

  it('Should give up after ten attempts rather than polling forever', () => {
    expect(MAX_POLL_ATTEMPTS).toBe(10)
    expect(pollDecision({ attempt: 8, documents: [pending] })).toEqual({
      action: POLL_ACTION.retry,
      attempt: 9,
      delayMs: POLL_INTERVAL_MS
    })
    expect(pollDecision({ attempt: 9, documents: [pending] })).toEqual({
      action: POLL_ACTION.giveUp
    })
    expect(pollDecision({ attempt: 9, documents: null })).toEqual({
      action: POLL_ACTION.giveUp
    })
  })

  it('Should still settle on the final attempt when the scans have finished', () => {
    expect(pollDecision({ attempt: 9, documents: [complete] })).toEqual({
      action: POLL_ACTION.settled
    })
  })
})
