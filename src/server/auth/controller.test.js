import { describe, expect, test, vi, beforeEach } from 'vitest'
import { authController } from './controller.js'

const verifyTokenMock = vi.hoisted(() => vi.fn())
const getPermissionsMock = vi.hoisted(() => vi.fn())
const getSafeRedirectMock = vi.hoisted(() => vi.fn())

vi.mock('../../auth/verify-token.js', () => ({
  verifyToken: verifyTokenMock
}))

vi.mock('../../auth/get-permissions.js', () => ({
  getPermissions: getPermissionsMock
}))

vi.mock('../../auth/get-safe-redirect.js', () => ({
  getSafeRedirect: getSafeRedirectMock
}))

describe('signinOidc', () => {
  const redirectPath = '/somewhere'

  const buildRequest = () => ({
    auth: {
      isAuthenticated: true,
      credentials: {
        profile: {
          crn: 'CRN123',
          organisationId: 'ORG-1',
          sessionId: 'session-1'
        },
        token: 'access-token',
        refreshToken: 'refresh-token'
      }
    },
    logger: { error: vi.fn() },
    server: { app: { cache: { set: vi.fn() } } },
    cookieAuth: { set: vi.fn() },
    yar: { get: vi.fn().mockReturnValue(redirectPath), clear: vi.fn() }
  })

  const h = {
    view: vi.fn().mockReturnValue('rendered-view'),
    redirect: vi.fn().mockReturnValue('redirected')
  }

  beforeEach(() => {
    vi.clearAllMocks()
    getPermissionsMock.mockResolvedValue({ role: 'admin', scope: ['read'] })
    getSafeRedirectMock.mockReturnValue(redirectPath)
  })

  test('completes the sign in when the token verifies', async () => {
    verifyTokenMock.mockResolvedValue(undefined)
    const request = buildRequest()

    const response = await authController.signinOidc.handler(request, h)

    expect(request.cookieAuth.set).toHaveBeenCalledWith({
      sessionId: 'session-1'
    })
    expect(h.redirect).toHaveBeenCalledWith(redirectPath)
    expect(response).toBe('redirected')
  })

  test('shows the sign-in failure page when token verification fails', async () => {
    verifyTokenMock.mockRejectedValue(new Error('Client request timeout'))
    const request = buildRequest()

    const response = await authController.signinOidc.handler(request, h)

    expect(h.view).toHaveBeenCalledWith(
      'auth/unauthorised',
      expect.objectContaining({
        pageTitle: 'Sorry, we are unable to sign you in'
      })
    )
    expect(response).toBe('rendered-view')
    expect(request.cookieAuth.set).not.toHaveBeenCalled()
    expect(request.server.app.cache.set).not.toHaveBeenCalled()
    expect(request.logger.error).toHaveBeenCalledWith(
      { err: expect.any(Error) },
      'Token verification failed for /auth/sign-in-oidc'
    )
  })
})
