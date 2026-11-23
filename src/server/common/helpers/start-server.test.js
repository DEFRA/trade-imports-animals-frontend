import { getDefaultAutoSelectFamilyAttemptTimeout } from 'node:net'
import Wreck from '@hapi/wreck'

import { beforeAll, afterAll, describe, expect, test, vi } from 'vitest'
import { statusCodes } from '../constants/status-codes.js'
import { mockOidcConfig } from '../test-helpers/mock-oidc-config.js'
import { restoreConfigAfterEach } from '../test-helpers/restore-config-after-each.js'
import { config } from '../../../config/config.js'
import { recordEcsLogLines } from '../test-helpers/ecs-log-lines.js'

vi.mock('../../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

async function createServerThatInitialisesOnStart(createRealServer) {
  const server = await createRealServer()
  server.start = () => server.initialize()
  return server
}

vi.mock('../../server.js', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    createServer: vi.fn(() =>
      createServerThatInitialisesOnStart(actual.createServer)
    )
  }
})

import { startServer } from './start-server.js'
import { createServer } from '../../server.js'

const linesWithMessage = (ecsLog, message) =>
  ecsLog.lines().filter((line) => line.message === message)

describe('#startServer', () => {
  describe('When server starts', () => {
    let server

    beforeAll(async () => {
      server = await startServer()
    })

    afterAll(async () => {
      await server?.stop({ timeout: 0 })
    })

    test('answers the health check with 200 and success once started', async () => {
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
    const ecsLog = recordEcsLogLines()
    restoreConfigAfterEach(['httpProxy'])

    test('logs once that the retrying keep-alive agent is installed', async () => {
      config.set('httpProxy', null)

      const server = await startServer()
      await server.stop({ timeout: 0 })

      expect(
        linesWithMessage(
          ecsLog,
          'Wreck plain-HTTP calls use the retrying keep-alive agent'
        )
      ).toEqual([
        expect.objectContaining({ 'log.level': 'info', keepAliveAgent: true })
      ])
    })
  })

  describe('When an HTTP proxy is configured', () => {
    const ecsLog = recordEcsLogLines()
    restoreConfigAfterEach(['httpProxy'])

    test('logs once that Wreck keeps its own agent, without the proxy URL', async () => {
      config.set('httpProxy', 'http://proxy.test:3128')

      const server = await startServer()
      await server.stop({ timeout: 0 })

      const lines = linesWithMessage(
        ecsLog,
        'HTTP proxy configured; Wreck keeps its own agent'
      )
      expect(lines).toEqual([
        expect.objectContaining({
          'log.level': 'info',
          keepAliveAgent: false,
          reason: 'httpProxy'
        })
      ])
      expect(JSON.stringify(lines)).not.toContain('proxy.test')
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
