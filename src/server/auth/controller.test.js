import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../auth/verify-token.js', () => ({
  verifyToken: vi.fn(() => {
    throw new Error('ETIMEDOUT')
  })
}))

describe('#signinOidc', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  it('renders the sign-in failure page when the provider rejects the callback', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/auth/sign-in-oidc?error=access_denied'
    })

    expect(statusCode).toBe(statusCodes.ok)
    expect(result).toEqual(
      expect.stringContaining('Sorry, we are unable to sign you in.</h1>')
    )
    expect(result).toEqual(
      expect.stringContaining(
        'Sorry, we are unable to sign you in | Import notification service'
      )
    )
  })

  it('renders the styled error page when token verification fails on a Bell-authenticated callback', async () => {
    const { statusCode, result } = await server.inject({
      method: 'GET',
      url: '/auth/sign-in-oidc',
      auth: {
        strategy: 'defra-id',
        credentials: {
          profile: { sessionId: 'CONTROLLER_TEST_SESSION' },
          token: 'token',
          refreshToken: 'refresh-token'
        }
      }
    })

    expect(statusCode).toBe(statusCodes.internalServerError)
    expect(result).toEqual(expect.stringContaining('>500</h1>'))
    expect(result).toEqual(
      expect.stringContaining(
        'Something went wrong | Import notification service'
      )
    )
  })
})
