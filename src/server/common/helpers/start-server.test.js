import { beforeAll, afterAll, describe, expect, test, vi } from 'vitest'
import { statusCodes } from '../constants/status-codes.js'
import { mockOidcConfig } from '../test-helpers/mock-oidc-config.js'

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
