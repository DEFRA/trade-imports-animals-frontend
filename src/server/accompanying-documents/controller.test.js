import { vi } from 'vitest'

import { documentClient } from '../common/clients/document-client.js'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'

import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'

vi.mock('../../auth/get-oidc-config.js', () => ({
  getOidcConfig: vi.fn(() => Promise.resolve(mockOidcConfig))
}))

vi.mock('../../config/config.js', async (importOriginal) => {
  const { mockAuthConfig } =
    await import('../common/test-helpers/mock-auth-config.js')
  return mockAuthConfig(importOriginal)
})

describe('#accompanyingDocumentsController', () => {
  let server

  beforeAll(async () => {
    vi.spyOn(documentClient, 'initiate').mockResolvedValue({
      uploadId: 'TEST-UPLOAD-ID',
      uploadUrl: 'http://cdp-uploader/upload-and-scan/TEST-UPLOAD-ID'
    })

    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  describe('GET /accompanying-documents', () => {
    test('Should render the accompanying documents page with session values', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Accompanying documents'))
    })
  })

  describe('POST /accompanying-documents', () => {
    test('Should re-render with 400 when documentType is invalid', async () => {
      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          documentType: 'INVALID_TYPE',
          documentReference: 'REF-001',
          'issueDate-day': 10,
          'issueDate-month': 3,
          'issueDate-year': 2024
        }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(expect.stringContaining('Select a document type'))
    })

    test('Should re-render with 400 when documentReference contains invalid characters', async () => {
      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          documentType: 'ITAHC',
          documentReference: 'REF@#$!',
          'issueDate-day': 10,
          'issueDate-month': 3,
          'issueDate-year': 2024
        }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining(
          'Document reference must only contain letters, numbers, spaces and hyphens'
        )
      )
    })

    test('Should re-render with 400 when no file is provided', async () => {
      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          documentType: 'ITAHC',
          documentReference: 'REF-001',
          'issueDate-day': 10,
          'issueDate-month': 3,
          'issueDate-year': 2024
        }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(expect.stringContaining('Select a file to upload'))
    })

    test('Should redirect to / without calling documentClient.initiate when documentType is empty', async () => {
      documentClient.initiate.mockClear()

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          documentType: '',
          documentReference: '',
          'issueDate-day': '',
          'issueDate-month': '',
          'issueDate-year': ''
        }
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/')
      expect(documentClient.initiate).not.toHaveBeenCalled()
    })
  })
})
