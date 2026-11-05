import Jwt from '@hapi/jwt'

import { getOidcConfigWithRetry } from '../auth/get-oidc-config-with-retry.js'
import { refreshTokens } from '../auth/refresh-tokens.js'
import { getSafeRedirect } from '../auth/get-safe-redirect.js'
import { timeTokenExchange } from '../auth/token-exchange-timer.js'
import { config } from '../config/config.js'
import { isStubMode } from '../server/common/services/mode.js'
import { countSessionResolution } from '../server/common/helpers/call-counts/call-counts.js'

export const authPlugin = {
  plugin: {
    name: 'auth-plugin',
    register: async (server) => {
      server.auth.strategy('session', 'cookie', getCookieOptions())
      server.auth.default('session')

      if (isStubMode()) {
        return
      }

      const oidcConfig = await getOidcConfigWithRetry(server.logger)

      server.auth.strategy('defra-id', 'bell', getBellOptions(oidcConfig))
    }
  }
}

function getBellOptions(oidcConfig) {
  return {
    provider: {
      name: 'defra-id',
      protocol: 'oauth2',
      useParamsAuth: true,
      auth: oidcConfig.authorization_endpoint,
      token: timeTokenExchange(oidcConfig.token_endpoint),
      scope: ['openid', 'offline_access', config.get('defraId.clientId')],
      profile: function (credentials, _params, _get) {
        const payload = Jwt.token.decode(credentials.token).decoded.payload
        credentials.profile = {
          ...payload,
          crn: payload.contactId,
          name: `${payload.firstName} ${payload.lastName}`,
          organisationId: payload.currentRelationshipId
        }
      }
    },
    clientId: config.get('defraId.clientId'),
    clientSecret: config.get('defraId.clientSecret'),
    password: config.get('session.cookie.password'),
    isSecure: config.get('isProduction'),
    isSameSite: config.get('defraId.stateCookieSameSite'),
    location: function (request) {
      if (request.query.redirect) {
        const safeRedirect = getSafeRedirect(request.query.redirect)
        request.yar.set('redirect', safeRedirect)
      }

      return config.get('defraId.redirectUrl')
    },
    providerParams: function (request) {
      const params = {
        serviceId: config.get('defraId.serviceId'),
        p: config.get('defraId.policy'),
        response_mode: 'query'
      }

      if (request.path === '/auth/organisation') {
        params.forceReselection = true
        if (request.query.organisationId) {
          params.relationshipId = request.query.organisationId
        }
      }

      return params
    }
  }
}

function getCookieOptions() {
  return {
    cookie: {
      name: config.get('auth.cookieName'),
      password: config.get('session.cookie.password'),
      path: '/',
      isSecure: config.get('isProduction'),
      isSameSite: 'Strict'
    },
    redirectTo: function (request) {
      const target = `${request.url.pathname}${request.url.search}`
      return `/auth/sign-in?redirect=${encodeURIComponent(target)}`
    },
    validate: async function (request, session) {
      countSessionResolution(request)
      const userSession = await request.server.app.cache.get(session.sessionId)

      if (!userSession) {
        return { isValid: false }
      }

      try {
        const decoded = Jwt.token.decode(userSession.token)
        const clockSkewToleranceSec = 60
        Jwt.token.verifyTime(decoded, { timeSkewSec: clockSkewToleranceSec })
      } catch {
        if (!config.get('defraId.refreshTokens')) {
          return { isValid: false }
        }
        try {
          const { access_token: token, refresh_token: refreshToken } =
            await refreshTokens(userSession.refreshToken)
          userSession.token = token
          userSession.refreshToken = refreshToken
          await request.server.app.cache.set(session.sessionId, userSession)
        } catch {
          return { isValid: false }
        }
      }

      return { isValid: true, credentials: userSession }
    }
  }
}

export { getBellOptions, getCookieOptions }
