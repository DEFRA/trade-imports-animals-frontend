import { vi } from 'vitest'

import { documentClient } from '../common/clients/document-client.js'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
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

const TEST_DOCUMENTS = [
  {
    uploadId: 'UPLOAD-1',
    filename: 'cert.pdf',
    documentType: 'ITAHC',
    documentReference: 'REF-001',
    dateOfIssue: '2026-01-01'
  },
  {
    uploadId: 'UPLOAD-2',
    filename: 'health.pdf',
    documentType: 'VETERINARY_HEALTH_CERTIFICATE',
    documentReference: 'REF-002',
    dateOfIssue: '2026-02-01'
  }
]

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

  beforeEach(() => {
    getSessionValue.mockReset()
    setSessionValue.mockReset()
    // Default: no documents in session
    getSessionValue.mockReturnValue(null)
  })

  describe('GET /accompanying-documents', () => {
    test('Should render the page with empty document list', async () => {
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
      expect(result).toEqual(expect.stringContaining('Add a document'))
    })

    test('Should show document rows with status tags when documents are in session', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === 'documents') return TEST_DOCUMENTS
        return null
      })
      vi.spyOn(documentClient, 'getStatus')
        .mockResolvedValueOnce({ scanStatus: 'PENDING' })
        .mockResolvedValueOnce({ scanStatus: 'COMPLETE' })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('cert.pdf'))
      expect(result).toEqual(expect.stringContaining('health.pdf'))
      expect(result).toEqual(expect.stringContaining('Checking'))
      expect(result).toEqual(expect.stringContaining('Safe'))
      expect(result).toEqual(expect.stringContaining('Add another document'))
    })

    test('Should include meta refresh when any document is PENDING', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === 'documents') return [TEST_DOCUMENTS[0]]
        return null
      })
      vi.spyOn(documentClient, 'getStatus').mockResolvedValueOnce({
        scanStatus: 'PENDING'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
    })

    test('Should not include meta refresh and show manual refresh link when attempt >= 10', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === 'documents') return [TEST_DOCUMENTS[0]]
        return null
      })
      vi.spyOn(documentClient, 'getStatus').mockResolvedValueOnce({
        scanStatus: 'PENDING'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents?attempt=10',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).not.toEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
      expect(result).toEqual(expect.stringContaining('Refresh to check status'))
    })

    test('Should show error summary and no Save and continue when a document is REJECTED', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === 'documents') return [TEST_DOCUMENTS[0]]
        return null
      })
      vi.spyOn(documentClient, 'getStatus').mockResolvedValueOnce({
        scanStatus: 'REJECTED'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Virus found'))
      expect(result).toEqual(expect.stringContaining('contains a virus'))
      expect(result).not.toEqual(expect.stringContaining('Save and continue'))
    })

    test('Should show Save and continue when all documents are COMPLETE', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === 'documents') return [TEST_DOCUMENTS[0]]
        return null
      })
      vi.spyOn(documentClient, 'getStatus').mockResolvedValueOnce({
        scanStatus: 'COMPLETE'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual(expect.stringContaining('Save and continue'))
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
