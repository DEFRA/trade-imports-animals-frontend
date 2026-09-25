import { describe, expect, test } from 'vitest'

import { requestLogger } from './request-logger.js'

const isLeftOutOfTheRequestLog = (path) =>
  requestLogger.options.ignoreFunc(undefined, { path })

describe('#requestLogger', () => {
  test.each([
    '/public',
    '/public/stylesheets/application.css',
    '/public/javascripts/application.js',
    '/health',
    '/favicon.ico'
  ])('Should leave %s out of the request log', (path) => {
    expect(isLeftOutOfTheRequestLog(path)).toBe(true)
  })

  test.each(['/', '/auth/sign-in', '/healthcheck', '/publications'])(
    'Should log %s',
    (path) => {
      expect(isLeftOutOfTheRequestLog(path)).toBe(false)
    }
  )
})
