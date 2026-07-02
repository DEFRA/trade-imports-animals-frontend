import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestServer } from '../test-server.js'

/** 'Your quote' — priced from the orchestrated evaluation, including
 * half-empty journeys reached by URL (Rulings item 2). */

let t
beforeEach(async () => {
  t = await createTestServer()
  await t.startJourney()
})
afterEach(() => t.stop())

describe('routes/endings/quote-summary', () => {
  it('prices a half-empty journey reached by URL (Rulings item 2)', async () => {
    await t.post(`${t.base}/your-vehicle`, {
      registration: 'AB12CDE',
      estimatedValue: '10000'
    })
    const response = await t.get(`${t.base}/quote-summary`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('Your quote')
    expect(response.payload).toContain('Estimated annual premium:')
    // 480 base + 1% of 10000 value loading, default multiplier.
    expect(response.payload).toContain('£580')
    expect(response.payload).toContain('None')
  })

  it('prices the full journey with cover and extras labels', async () => {
    await t.answerAllTasks({
      'optional-extras': { extras: ['breakdown', 'windscreen'] }
    })
    const response = await t.get(`${t.base}/quote-summary`)
    // 480 comprehensive + 60 breakdown + 20 windscreen.
    expect(response.payload).toContain('£560')
    expect(response.payload).toContain('Comprehensive')
    expect(response.payload).toContain('Breakdown cover, Windscreen cover')
    expect(response.payload).toContain(
      'This is an illustrative price for a prototype. It is not a real quote.'
    )
  })

  it('renders Accept and continue and POSTs on to CYA without writing', async () => {
    await t.answerAllTasks()
    const page = await t.get(`${t.base}/quote-summary`)
    expect(page.payload).toContain('Accept and continue')
    const response = await t.post(`${t.base}/quote-summary`)
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${t.base}/check-your-answers`)
  })
})
