import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestServer } from '../test-server.js'

/** The CYA POST hard gate (Rulings item 2) and the graft-3 stale
 * recheck: a gap between render and POST re-renders CYA as a 200 with
 * the blockers called out — never a 500, never a redirect elsewhere. */

let harness
beforeEach(async () => {
  harness = await createTestServer()
  await harness.startJourney()
})
afterEach(() => harness.stop())

describe('routes/endings/submit', () => {
  it('never reaches confirmation from an incomplete journey', async () => {
    const response = await harness.post(`${harness.base}/check-your-answers`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('govuk-error-summary')
    expect(response.payload).toContain('Full name is required')
    const confirmation = await harness.get(`${harness.base}/confirmation`)
    expect(confirmation.statusCode).toBe(302)
  })

  it('submits a Fulfilled journey and redirects to confirmation', async () => {
    await harness.answerAllTasks()
    const response = await harness.post(`${harness.base}/check-your-answers`)
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(`${harness.base}/confirmation`)
  })

  it('re-renders CYA calling out a stale gap (Add at least one claim)', async () => {
    await harness.answerAllTasks({ 'driving-history': { hadClaims: 'yes' } })
    await harness.post(`${harness.base}/claims/add`, {
      claimType: 'theft',
      claimAmount: '450'
    })
    // State invalidated between the CYA render and the POST.
    await harness.get(`${harness.base}/claims/0/remove`)
    const response = await harness.post(`${harness.base}/check-your-answers`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('govuk-error-summary')
    expect(response.payload).toContain('Add at least one claim')
  })

  it('a re-POST of a submitted journey resolves to read-only CYA', async () => {
    await harness.answerAllTasks()
    await harness.post(`${harness.base}/check-your-answers`)
    // The wired guard (Step 11.6) intercepts the frozen POST and 302s to
    // the read-only CYA GET — the freeze answer, never a second submit.
    const rePost = await harness.post(`${harness.base}/check-your-answers`)
    expect(rePost.statusCode).toBe(302)
    expect(rePost.headers.location).toBe(`${harness.base}/check-your-answers`)
    const response = await harness.get(`${harness.base}/check-your-answers`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).not.toContain('govuk-error-summary')
    expect(response.payload).not.toContain('Accept and get quote')
    expect(response.payload).toContain('Alex Driver')
  })
})
