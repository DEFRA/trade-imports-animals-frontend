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
      expect(result).toEqual(expect.stringContaining('Document 1'))
      expect(result).not.toEqual(
        expect.stringContaining('aria-disabled="true"')
      )
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
      expect(result).toEqual(expect.stringContaining('Document 3'))
    })

    test('Should show manual refresh link (not meta-refresh) when any document is PENDING', async () => {
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
      expect(result).not.toEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
      expect(result).toEqual(
        expect.stringContaining('Refresh virus scan status')
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
      expect(result).toEqual(expect.stringContaining('aria-disabled="true"'))
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
    afterEach(() => {
      vi.unstubAllGlobals()
    })

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

    test('Should re-render with 400 and Select a document type error when documentType is empty', async () => {
      documentClient.initiate.mockClear()

      const { statusCode, result } = await server.inject({
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

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(expect.stringContaining('Select a document type'))
      expect(documentClient.initiate).not.toHaveBeenCalled()
    })

    test('Should upload file, update session, and redirect on successful POST', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 302 }))

      documentClient.initiate.mockResolvedValue({
        uploadId: 'TEST-UPLOAD-ID',
        uploadUrl: 'http://cdp-uploader/upload-and-scan/TEST-UPLOAD-ID'
      })
      getSessionValue.mockImplementation((request, key) => {
        if (key === 'documents') return []
        if (key === 'referenceNumber') return 'REF-123'
        return null
      })

      const boundary = '----TestBoundary12345'
      const fileContent = Buffer.from('fake pdf content')
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="documentType"',
        '',
        'ITAHC',
        `--${boundary}`,
        'Content-Disposition: form-data; name="documentReference"',
        '',
        'REF-001',
        `--${boundary}`,
        'Content-Disposition: form-data; name="issueDate-day"',
        '',
        '10',
        `--${boundary}`,
        'Content-Disposition: form-data; name="issueDate-month"',
        '',
        '3',
        `--${boundary}`,
        'Content-Disposition: form-data; name="issueDate-year"',
        '',
        '2024',
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.pdf"',
        'Content-Type: application/pdf',
        '',
        fileContent.toString('binary'),
        `--${boundary}--`
      ].join('\r\n')

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`
        },
        payload: Buffer.from(body, 'binary')
      })

      expect(documentClient.initiate).toHaveBeenCalled()
      expect(global.fetch).toHaveBeenCalledWith(
        'http://cdp-uploader/upload-and-scan/TEST-UPLOAD-ID',
        expect.objectContaining({ method: 'POST' })
      )
      expect(setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        'documents',
        expect.arrayContaining([
          expect.objectContaining({
            uploadId: 'TEST-UPLOAD-ID',
            documentType: 'ITAHC',
            documentReference: 'REF-001',
            dateOfIssue: '2024-03-10'
          })
        ])
      )
      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/accompanying-documents')
    })

    test('Should redirect to /accompanying-documents and NOT call setSessionValue when cdp-uploader returns non-3xx', async () => {
      vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ status: 200 }))

      documentClient.initiate.mockResolvedValue({
        uploadId: 'TEST-UPLOAD-ID',
        uploadUrl: 'http://cdp-uploader/upload-and-scan/TEST-UPLOAD-ID'
      })
      getSessionValue.mockImplementation((request, key) => {
        if (key === 'documents') return []
        if (key === 'referenceNumber') return 'REF-123'
        return null
      })

      const boundary = '----TestBoundary99999'
      const fileContent = Buffer.from('fake pdf content')
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="documentType"',
        '',
        'ITAHC',
        `--${boundary}`,
        'Content-Disposition: form-data; name="documentReference"',
        '',
        'REF-001',
        `--${boundary}`,
        'Content-Disposition: form-data; name="issueDate-day"',
        '',
        '10',
        `--${boundary}`,
        'Content-Disposition: form-data; name="issueDate-month"',
        '',
        '3',
        `--${boundary}`,
        'Content-Disposition: form-data; name="issueDate-year"',
        '',
        '2024',
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.pdf"',
        'Content-Type: application/pdf',
        '',
        fileContent.toString('binary'),
        `--${boundary}--`
      ].join('\r\n')

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`
        },
        payload: Buffer.from(body, 'binary')
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/accompanying-documents')
      expect(setSessionValue).not.toHaveBeenCalled()
    })

    test('Should return 400 with error message when 10 documents already in session', async () => {
      const tenDocuments = Array.from({ length: 10 }, (_, i) => ({
        uploadId: `UPLOAD-${i}`,
        filename: `doc${i}.pdf`,
        documentType: 'ITAHC',
        documentReference: `REF-00${i}`,
        dateOfIssue: '2026-01-01'
      }))
      getSessionValue.mockImplementation((request, key) => {
        if (key === 'documents') return tenDocuments
        return null
      })
      vi.spyOn(documentClient, 'getStatus').mockResolvedValue({
        scanStatus: 'COMPLETE'
      })

      const boundary = '----TestBoundaryLimit'
      const fileContent = Buffer.from('fake pdf content')
      const body = [
        `--${boundary}`,
        'Content-Disposition: form-data; name="documentType"',
        '',
        'ITAHC',
        `--${boundary}`,
        'Content-Disposition: form-data; name="documentReference"',
        '',
        'REF-001',
        `--${boundary}`,
        'Content-Disposition: form-data; name="issueDate-day"',
        '',
        '10',
        `--${boundary}`,
        'Content-Disposition: form-data; name="issueDate-month"',
        '',
        '3',
        `--${boundary}`,
        'Content-Disposition: form-data; name="issueDate-year"',
        '',
        '2024',
        `--${boundary}`,
        'Content-Disposition: form-data; name="file"; filename="test.pdf"',
        'Content-Type: application/pdf',
        '',
        fileContent.toString('binary'),
        `--${boundary}--`
      ].join('\r\n')

      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        headers: {
          'content-type': `multipart/form-data; boundary=${boundary}`
        },
        payload: Buffer.from(body, 'binary')
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(
        expect.stringContaining('You can add a maximum of 10 documents')
      )
    })
  })

  describe('GET /accompanying-documents/status', () => {
    test('Should return JSON with documents and their statuses when documents are in session', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === 'documents') return TEST_DOCUMENTS
        return null
      })
      vi.spyOn(documentClient, 'getStatus')
        .mockResolvedValueOnce({ scanStatus: 'COMPLETE' })
        .mockResolvedValueOnce({ scanStatus: 'PENDING' })

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/status',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toHaveProperty('documents')
      expect(result.documents).toHaveLength(2)
      expect(result.documents[0]).toMatchObject({
        uploadId: 'UPLOAD-1',
        scanStatus: 'COMPLETE'
      })
      expect(result.documents[1]).toMatchObject({
        uploadId: 'UPLOAD-2',
        scanStatus: 'PENDING'
      })
    })

    test('Should return empty documents array when no documents in session', async () => {
      getSessionValue.mockReturnValue(null)

      const { statusCode, result } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/status',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(result).toEqual({ documents: [] })
    })
  })
})
