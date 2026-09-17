import { createServer } from '../../server.js'
import { vi } from 'vitest'

import { siblingFrontendBaseUrls } from '../../../config/config.js'
import { mockOidcConfig } from '../test-helpers/mock-oidc-config.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

describe('#contentSecurityPolicy', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  test('Should set the CSP policy header', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/health'
    })

    expect(resp.headers['content-security-policy']).toBeDefined()
  })

  test('Should allow self and every sibling frontend origin in form-action', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/health'
    })

    const [, formAction] = /form-action ([^;]*)/.exec(
      resp.headers['content-security-policy']
    )

    expect(formAction.trim().split(' ')).toEqual([
      "'self'",
      ...siblingFrontendBaseUrls.map((baseUrl) => new URL(baseUrl).origin)
    ])
  })
})
