import { vi } from 'vitest'

import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { documentClient } from '../common/clients/document-client.js'
import {
  getSessionValue,
  setSessionValue
} from '../common/helpers/session-helpers.js'

import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

vi.mock('../common/helpers/session-helpers.js', () => ({
  getSessionValue: vi.fn(),
  setSessionValue: vi.fn()
}))

describe('#uploadReceivedController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  describe('GET /accompanying-documents/upload-received', () => {
    test('Should redirect to /accompanying-documents when no uploadId in session', async () => {
      getSessionValue.mockReturnValue(null)

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/upload-received'
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/accompanying-documents')
    })

    test('Should render checking state when scan is PENDING and clear uploadUrl', async () => {
      getSessionValue.mockReturnValue('TEST-UPLOAD-ID')
      vi.spyOn(documentClient, 'getStatus').mockResolvedValueOnce({
        scanStatus: 'PENDING'
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/upload-received'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Your document is being checked')
      )
      expect(result).toEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
      expect(result).toEqual(expect.stringContaining('Refresh to check status'))
      expect(setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        'uploadUrl',
        null
      )
    })

    test('Should render timed-out state when PENDING and attempt >= 10', async () => {
      getSessionValue.mockReturnValue('TEST-UPLOAD-ID')
      vi.spyOn(documentClient, 'getStatus').mockResolvedValueOnce({
        scanStatus: 'PENDING'
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/upload-received?attempt=10'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('This is taking longer than expected')
      )
      expect(result).not.toEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
    })

    test('Should render success state and clear session when scan is COMPLETE', async () => {
      getSessionValue.mockReturnValue('TEST-UPLOAD-ID')
      vi.spyOn(documentClient, 'getStatus').mockResolvedValueOnce({
        scanStatus: 'COMPLETE'
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/upload-received'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Document uploaded successfully')
      )
      expect(result).toEqual(expect.stringContaining('Continue'))
      expect(setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        'uploadUrl',
        null
      )
      expect(setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        'uploadId',
        null
      )
    })

    test('Should render virus error state and clear session when scan is REJECTED', async () => {
      getSessionValue.mockReturnValue('TEST-UPLOAD-ID')
      vi.spyOn(documentClient, 'getStatus').mockResolvedValueOnce({
        scanStatus: 'REJECTED'
      })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/upload-received'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('The selected file contains a virus')
      )
      expect(result).toEqual(expect.stringContaining('/accompanying-documents'))
      expect(setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        'uploadUrl',
        null
      )
      expect(setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        'uploadId',
        null
      )
    })

    test('Should treat as PENDING and render checking state when getStatus throws', async () => {
      getSessionValue.mockReturnValue('TEST-UPLOAD-ID')
      vi.spyOn(documentClient, 'getStatus').mockRejectedValueOnce(
        new Error('Network error')
      )

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/upload-received'
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('Your document is being checked')
      )
    })
  })
})
