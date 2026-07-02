import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestServer } from '../test-server.js'

/** 'Quote confirmed' — status-guarded in BOTH paradigms: pre-submit it
 * redirects to the start page; post-submit it renders the pinned panel
 * with the deterministic reference. */

let t
beforeEach(async () => {
  t = await createTestServer()
  await t.startJourney()
})
afterEach(() => t.stop())

describe('routes/endings/confirmation', () => {
  it('redirects a pre-submit visit to the start page', async () => {
    await t.answerAllTasks()
    const response = await t.get(`${t.base}/confirmation`)
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(t.base)
  })

  it('renders the panel, reference and saved premium after submit', async () => {
    await t.answerAllTasks()
    await t.post(`${t.base}/check-your-answers`)
    const response = await t.get(`${t.base}/confirmation`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('Quote confirmed')
    expect(response.payload).toMatch(/CI-[0-9A-F]{6}/)
    expect(response.payload).toContain(
      'We have saved your quote of £480 per year.'
    )
  })

  it('a refresh re-renders the identical deterministic reference', async () => {
    await t.answerAllTasks()
    await t.post(`${t.base}/check-your-answers`)
    const first = await t.get(`${t.base}/confirmation`)
    const second = await t.get(`${t.base}/confirmation`)
    const referenceOf = (response) =>
      response.payload.match(/CI-[0-9A-F]{6}/)[0]
    expect(referenceOf(second)).toBe(referenceOf(first))
  })
})
