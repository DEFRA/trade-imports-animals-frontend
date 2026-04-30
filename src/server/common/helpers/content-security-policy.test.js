import { createServer } from '../../server.js'
import { vi } from 'vitest'

import { config } from '../../../config/config.js'
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
      url: '/'
    })

    expect(resp.headers['content-security-policy']).toBeDefined()
  })

  test('Should include cdp-uploader origin in form-action directive', async () => {
    const resp = await server.inject({
      method: 'GET',
      url: '/'
    })

    const cdpUploaderOrigin = new URL(config.get('cdpUploaderUrl')).origin
    const csp = resp.headers['content-security-policy']

    expect(csp).toContain('form-action')
    expect(csp).toContain(cdpUploaderOrigin)
  })
})
