import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestServer } from '../test-server.js'

/** CYA — open by URL pre-submit with soft prompts (Rulings item 2);
 * the pinned Change composition; read-only once submitted. */

let t
beforeEach(async () => {
  t = await createTestServer()
  await t.startJourney()
})
afterEach(() => t.stop())

describe('routes/endings/check-your-answers', () => {
  it('opens mid-journey with the soft you-still-need-to banner', async () => {
    const response = await t.get(`${t.base}/check-your-answers`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain(
      'You still need to complete some sections'
    )
    expect(response.payload).toContain('Full name is required')
    expect(response.payload).toContain('Email is required')
  })

  it('renders the rows with Change actions and no banner when complete', async () => {
    await t.answerAllTasks()
    const response = await t.get(`${t.base}/check-your-answers`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).not.toContain(
      'You still need to complete some sections'
    )
    expect(response.payload).toContain('Alex Driver')
    expect(response.payload).toContain(`${t.base}/about-you?change=1`)
    expect(response.payload).toContain('recent claims')
    expect(response.payload).toContain('Accept and get quote')
    expect(response.payload).toContain('Estimated annual premium:')
  })

  it('renders read-only after submit: no actions, no send form', async () => {
    await t.answerAllTasks()
    await t.post(`${t.base}/check-your-answers`)
    const response = await t.get(`${t.base}/check-your-answers`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('Alex Driver')
    expect(response.payload).not.toContain('?change=1')
    expect(response.payload).not.toContain('Accept and get quote')
  })
})
