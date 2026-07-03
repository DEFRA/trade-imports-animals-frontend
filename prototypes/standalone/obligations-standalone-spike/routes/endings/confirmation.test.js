import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createTestServer } from '../test-server.js'

const REFERENCE_PATTERN = /CI-[0-9A-F]{6}/

let testServer
beforeEach(async () => {
  testServer = await createTestServer()
  await testServer.startJourney()
})
afterEach(() => testServer.stop())

describe('routes/endings/confirmation', () => {
  it('redirects a pre-submit visit to the start page', async () => {
    await testServer.answerAllTasks()
    const response = await testServer.get(`${testServer.base}/confirmation`)
    expect(response.statusCode).toBe(302)
    expect(response.headers.location).toBe(testServer.base)
  })

  it('renders the panel, reference and saved premium after submit', async () => {
    await testServer.answerAllTasks()
    await testServer.post(`${testServer.base}/check-your-answers`)
    const response = await testServer.get(`${testServer.base}/confirmation`)
    expect(response.statusCode).toBe(200)
    expect(response.payload).toContain('Quote confirmed')
    expect(response.payload).toMatch(REFERENCE_PATTERN)
    expect(response.payload).toContain(
      'We have saved your quote of £480 per year.'
    )
  })

  it('a refresh re-renders the identical deterministic reference', async () => {
    await testServer.answerAllTasks()
    await testServer.post(`${testServer.base}/check-your-answers`)
    const first = await testServer.get(`${testServer.base}/confirmation`)
    const second = await testServer.get(`${testServer.base}/confirmation`)
    const referenceOf = (response) =>
      response.payload.match(REFERENCE_PATTERN)[0]
    expect(referenceOf(second)).toBe(referenceOf(first))
  })
})
