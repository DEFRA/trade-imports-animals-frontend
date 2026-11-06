import { getDefaultAutoSelectFamilyAttemptTimeout } from 'node:net'
import Wreck from '@hapi/wreck'

import { beforeAll, afterAll, describe, expect, test, vi } from 'vitest'
import { statusCodes } from '../constants/status-codes.js'
import { mockOidcConfig } from '../test-helpers/mock-oidc-config.js'
import { restoreConfigAfterEach } from '../test-helpers/restore-config-after-each.js'
import { config } from '../../../config/config.js'
import { recordModuleLoggerInfo } from '../test-helpers/module-logger-lines.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

// Wrap createServer so server.start() calls initialize() instead of binding
// to a port — inject() works after initialize(), no available port needed.
vi.mock('../../server.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    createServer: vi.fn(async () => {
      const server = await actual.createServer()
      server.start = () => server.initialize()
      return server
    })
  }
})

import { startServer } from './start-server.js'
import { createServer } from '../../server.js'

describe('#startServer', () => {
  describe('When server starts', () => {
    let server

    beforeAll(async () => {
      server = await startServer()
    })

    afterAll(async () => {
      await server?.stop({ timeout: 0 })
    })

    test('Should start up server as expected', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/health'
      })

      expect(result).toEqual({ message: 'success' })
      expect(statusCode).toBe(statusCodes.ok)
    })

    test('gives each address of a host one second to connect before trying the next', () => {
      expect(getDefaultAutoSelectFamilyAttemptTimeout()).toBe(1000)
    })

    test('installs a keep-alive agent for Wreck calls made without an agent', () => {
      expect(Wreck.agents.http.keepAlive).toBe(true)
    })
  })

  describe('When no HTTP proxy is configured', () => {
    const infoLines = recordModuleLoggerInfo()
    restoreConfigAfterEach(['httpProxy'])

    test('logs once that the retrying keep-alive agent is installed', async () => {
      config.set('httpProxy', null)

      const server = await startServer()
      await server.stop({ timeout: 0 })

      expect(
        infoLines.entriesWith(
          'Wreck plain-HTTP calls use the retrying keep-alive agent'
        )
      ).toEqual([
        {
          fields: { keepAliveAgent: true },
          message: 'Wreck plain-HTTP calls use the retrying keep-alive agent'
        }
      ])
    })
  })

  describe('When an HTTP proxy is configured', () => {
    const infoLines = recordModuleLoggerInfo()
    restoreConfigAfterEach(['httpProxy'])

    test('logs once that Wreck keeps its own agent, without the proxy URL', async () => {
      config.set('httpProxy', 'http://proxy.test:3128')

      const server = await startServer()
      await server.stop({ timeout: 0 })

      const entries = infoLines.entriesWith(
        'HTTP proxy configured; Wreck keeps its own agent'
      )
      expect(entries).toEqual([
        {
          fields: { keepAliveAgent: false, reason: 'httpProxy' },
          message: 'HTTP proxy configured; Wreck keeps its own agent'
        }
      ])
      expect(JSON.stringify(entries)).not.toContain('proxy.test')
    })
  })

  describe('When server start fails', () => {
    test('Should propagate createServer errors', async () => {
      vi.mocked(createServer).mockRejectedValueOnce(
        new Error('Server failed to start')
      )

      await expect(startServer()).rejects.toThrow('Server failed to start')
    })
  })
})
