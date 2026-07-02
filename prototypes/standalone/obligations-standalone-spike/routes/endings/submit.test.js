import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestServer } from '../test-server.js'

/** The CYA POST hard gate (Rulings item 2) and the graft-3 stale
 * recheck: a gap between render and POST re-renders CYA as a 200 with
 * the blockers called out — never a 500, never a redirect elsewhere. */

let t
beforeEach(async () => {
  t = await createTestServer()
  await t.startJourney()
})
afterEach(() => t.stop())

describe('routes/endings/submit', () => {
  it('never reaches confirmation from an incomplete journey', async () => {
    const response = await t.post(`${t.base}/check-your-answers`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('govuk-error-summary')
    expect(response.payload).toContain('Full name is required')
    const confirmation = await t.get(`${t.base}/confirmation`)
    expect(confirmation.statusCode).toBe(302)
  })

  it('submits a Fulfilled journey and redirects to confirmation', async () => {
    await t.answerAllTasks()
    const response = await t.post(`${t.base}/check-your-answers`)
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${t.base}/confirmation`)
  })

  it('re-renders CYA calling out a stale gap (Add at least one claim)', async () => {
    await t.answerAllTasks({ 'driving-history': { hadClaims: 'yes' } })
    await t.post(`${t.base}/claims/add`, {
      claimType: 'theft',
      claimAmount: '450'
    })
    // State invalidated between the CYA render and the POST.
    await t.get(`${t.base}/claims/0/remove`)
    const response = await t.post(`${t.base}/check-your-answers`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('govuk-error-summary')
    expect(response.payload).toContain('Add at least one claim')
  })

  it('a re-POST of a submitted journey resolves to read-only CYA', async () => {
    await t.answerAllTasks()
    await t.post(`${t.base}/check-your-answers`)
    // The wired guard (Step 11.6) intercepts the frozen POST and 302s to
    // the read-only CYA GET — the freeze answer, never a second submit.
    const rePost = await t.post(`${t.base}/check-your-answers`)
    expect(rePost.statusCode).toBe(302)
    expect(rePost.headers.location).toBe(`${t.base}/check-your-answers`)
    const response = await t.get(`${t.base}/check-your-answers`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).not.toContain('govuk-error-summary')
    expect(response.payload).not.toContain('Accept and get quote')
    expect(response.payload).toContain('Alex Driver')
  })
})
