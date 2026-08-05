import { describe, expect, it } from 'vitest'

import {
  MAX_POLL_ATTEMPTS,
  POLL_ACTION,
  POLL_INTERVAL_MS,
  SCAN_STATUS,
  allowsContinue,
  isSettled,
  pollDecision
} from './scan-poll.js'

describe('plant-products documents scan polling', () => {
  it('names every scan state the server can render', () => {
    expect(SCAN_STATUS).toEqual({
      COMPLETE: 'COMPLETE',
      PENDING: 'PENDING',
      REJECTED: 'REJECTED',
      UNAVAILABLE: 'UNAVAILABLE',
      NO_FILE: 'NO_FILE'
    })
  })

  it('holds the three-second interval and ten-attempt ceiling', () => {
    expect(POLL_INTERVAL_MS).toBe(3000)
    expect(MAX_POLL_ATTEMPTS).toBe(10)
  })

  it.each([
    { scanStatus: SCAN_STATUS.COMPLETE, settled: true },
    { scanStatus: SCAN_STATUS.REJECTED, settled: true },
    { scanStatus: SCAN_STATUS.NO_FILE, settled: true },
    { scanStatus: SCAN_STATUS.PENDING, settled: false },
    { scanStatus: SCAN_STATUS.UNAVAILABLE, settled: false }
  ])('treats $scanStatus as settled=$settled', ({ scanStatus, settled }) => {
    expect(isSettled(scanStatus)).toBe(settled)
  })

  it.each([
    { scanStatus: SCAN_STATUS.COMPLETE, continuable: true },
    { scanStatus: SCAN_STATUS.NO_FILE, continuable: true },
    { scanStatus: SCAN_STATUS.REJECTED, continuable: false },
    { scanStatus: SCAN_STATUS.PENDING, continuable: false },
    { scanStatus: SCAN_STATUS.UNAVAILABLE, continuable: false }
  ])(
    'lets $scanStatus continue = $continuable',
    ({ scanStatus, continuable }) => {
      expect(allowsContinue(scanStatus)).toBe(continuable)
    }
  )

  it('stops once every row has settled', () => {
    expect(
      pollDecision({
        attempt: 0,
        documents: [
          { scanStatus: SCAN_STATUS.COMPLETE },
          { scanStatus: SCAN_STATUS.NO_FILE }
        ]
      })
    ).toEqual({ action: POLL_ACTION.settled })
  })

  it('keeps going while a row is still checking', () => {
    expect(
      pollDecision({
        attempt: 0,
        documents: [{ scanStatus: SCAN_STATUS.PENDING }]
      })
    ).toEqual({
      action: POLL_ACTION.retry,
      attempt: 1,
      delayMs: POLL_INTERVAL_MS
    })
  })

  it('keeps going when the read was unusable', () => {
    expect(pollDecision({ attempt: 2, documents: null })).toEqual({
      action: POLL_ACTION.retry,
      attempt: 3,
      delayMs: POLL_INTERVAL_MS
    })
  })

  it('gives up at the attempt ceiling', () => {
    expect(
      pollDecision({
        attempt: MAX_POLL_ATTEMPTS - 1,
        documents: [{ scanStatus: SCAN_STATUS.PENDING }]
      })
    ).toEqual({ action: POLL_ACTION.giveUp })
  })
})
