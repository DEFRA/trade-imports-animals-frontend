import { getSignOutUrl } from '../../auth/get-sign-out-url.js'
import { validateState } from '../../auth/state.js'
import { verifyToken } from '../../auth/verify-token.js'
import { getPermissions } from '../../auth/get-permissions.js'
import { getSafeRedirect } from '../../auth/get-safe-redirect.js'
import { recordTokenExchange } from '../../auth/token-exchange-timer.js'
import { setlessBase, sharedCopy } from '../app/shared/kit.js'

const UNAUTHORISED_VIEW = 'auth/unauthorised'

const unauthorisedChrome = () => setlessBase(sharedCopy.unauthorised.title)

export const authController = {
  signin: {
    handler: async function (_request, h) {
      return h.redirect('/')
    }
  },
  signinOidc: {
    handler: async function (request, h) {
      recordTokenExchange(request)

      if (!request.auth.isAuthenticated) {
        request.logger?.error(
          {
            bellError: request.auth.error,
            state: request.query?.state
          },
          'Bell auth failed for /auth/sign-in-oidc'
        )
        return h.view(UNAUTHORISED_VIEW, unauthorisedChrome())
      }

      const { profile, token, refreshToken } = request.auth.credentials

      if (!profile.organisationId) {
        request.logger?.error(
          { crn: profile.crn },
          'Sign-in rejected: missing organisationId in Defra ID token'
        )
        return h.view(UNAUTHORISED_VIEW, unauthorisedChrome())
      }

      try {
        await verifyToken(token)
      } catch (err) {
        request.logger?.error(
          { err },
          'Token verification failed for /auth/sign-in-oidc'
        )
        return h.view(UNAUTHORISED_VIEW, unauthorisedChrome())
      }

      let role
      let scope
      try {
        ;({ role, scope } = await getPermissions(
          profile.crn,
          profile.organisationId,
          token
        ))
      } catch (err) {
        request.logger?.error(
          { err },
          'Failed to load user permissions at sign-in'
        )
        return h.view(UNAUTHORISED_VIEW, unauthorisedChrome())
      }

      await request.server.app.cache.set(profile.sessionId, {
        isAuthenticated: true,
        ...profile,
        role,
        scope,
        token,
        refreshToken
      })

      request.cookieAuth.set({ sessionId: profile.sessionId })

      const redirect = request.yar.get('redirect') ?? '/'
      request.yar.clear('redirect')
      return h.redirect(getSafeRedirect(redirect))
    }
  },
  signout: {
    handler: async function (request, h) {
      if (!request.auth.isAuthenticated) {
        return h.redirect('/')
      }
      if (request.auth.credentials?.sessionId) {
        await request.server.app.cache.drop(request.auth.credentials.sessionId)
      }
      request.cookieAuth.clear()
      const signOutUrl = await getSignOutUrl(
        request,
        request.auth.credentials.token
      )
      return h.redirect(signOutUrl)
    }
  },
  signoutOidc: {
    handler: async function (request, h) {
      if (request.auth.isAuthenticated) {
        if (request.query?.state) {
          validateState(request, request.query.state)
        }
        if (request.auth.credentials?.sessionId) {
          await request.server.app.cache.drop(
            request.auth.credentials.sessionId
          )
        }
        request.cookieAuth.clear()

        return h.redirect(
          await getSignOutUrl(request, request.auth.credentials.token)
        )
      }

      return h.redirect('/')
    }
  },
  organisation: {
    handler: async function (request, h) {
      const redirect = request.yar.get('redirect') ?? '/'
      request.yar.clear('redirect')
      return h.redirect(getSafeRedirect(redirect))
    }
  }
}
