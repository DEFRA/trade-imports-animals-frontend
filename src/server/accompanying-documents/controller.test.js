import { vi } from 'vitest'

import { documentClient } from '../common/clients/document-client.js'
import { config } from '../../config/config.js'
import { createServer } from '../server.js'
import { statusCodes } from '../common/constants/status-codes.js'
import { sessionKeys } from '../common/constants/session-keys.js'
import {
  getSessionValue,
  setSessionValue
} from '../common/helpers/session-helpers.js'

import { mockOidcConfig } from '../common/test-helpers/mock-oidc-config.js'
import {
  MAX_DOCUMENTS,
  MAX_DOCUMENT_REFERENCE_LENGTH,
  MAX_FILE_SIZE_BYTES,
  MAX_PAYLOAD_BYTES
} from './document-upload-config.js'
import { MAX_POLLING_ATTEMPTS } from './controller/index.js'

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

// Printable ASCII filler — keeps test buffers human-inspectable when dumped
const FILLER_BYTE = 0x41 // 'A'

const DEFAULT_MULTIPART_FIELDS = [
  ['documentType', 'ITAHC'],
  ['documentReference', 'REF001'],
  ['issueDate-day', '10'],
  ['issueDate-month', '3'],
  ['issueDate-year', '2024']
]

const buildMultipartBody = (
  boundary,
  fields = DEFAULT_MULTIPART_FIELDS,
  { fileBody, filename = 'test.pdf' } = {}
) => {
  // 'binary' (Latin-1) is safe here: test file content is ASCII-only; real binary files are handled by the multipart boundary
  const filePart =
    fileBody ?? Buffer.from('fake pdf content').toString('binary')
  return [
    ...fields.flatMap(([name, value]) => [
      `--${boundary}`,
      `Content-Disposition: form-data; name="${name}"`,
      '',
      value
    ]),
    `--${boundary}`,
    `Content-Disposition: form-data; name="file"; filename="${filename}"`,
    'Content-Type: application/pdf',
    '',
    filePart,
    `--${boundary}--`
  ].join('\r\n')
}

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
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
  })

  beforeEach(() => {
    vi.spyOn(documentClient, 'initiate').mockResolvedValue({
      uploadId: 'TEST-UPLOAD-ID'
    })
    vi.spyOn(documentClient, 'uploadFile').mockResolvedValue(undefined)
    getSessionValue.mockReset()
    setSessionValue.mockReset()
    // Default: no documents in session
    getSessionValue.mockReturnValue(null)
  })

  afterEach(() => {
    vi.restoreAllMocks()
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
      expect(result).toEqual(
        expect.stringContaining('Continue without documents')
      )
      expect(result).not.toEqual(
        expect.stringContaining('aria-disabled="true"')
      )
    })

    test('Should show document rows with status tags when documents are in session', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return TEST_DOCUMENTS
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
      expect(result).toEqual(
        expect.stringContaining('Intra-Trade Animal Health Certificate (ITAHC)')
      )
      expect(result).toEqual(
        expect.stringContaining('Veterinary health certificate')
      )
      expect(result).toEqual(expect.stringContaining('REF-001'))
      expect(result).toEqual(expect.stringContaining('1 January 2026'))
    })

    test('Should show manual refresh link (not meta-refresh) when any document is PENDING', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return [TEST_DOCUMENTS[0]]
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

    test('Should not include meta refresh and show manual refresh link when attempt >= MAX_POLLING_ATTEMPTS', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return [TEST_DOCUMENTS[0]]
        return null
      })
      vi.spyOn(documentClient, 'getStatus').mockResolvedValueOnce({
        scanStatus: 'PENDING'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `/accompanying-documents?attempt=${MAX_POLLING_ATTEMPTS}`,
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

    test('Should still show refresh link (not timed out) when attempt is one below MAX_POLLING_ATTEMPTS boundary', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return [TEST_DOCUMENTS[0]]
        return null
      })
      vi.spyOn(documentClient, 'getStatus').mockResolvedValueOnce({
        scanStatus: 'PENDING'
      })

      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `/accompanying-documents?attempt=${MAX_POLLING_ATTEMPTS - 1}`,
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      // one below MAX_POLLING_ATTEMPTS so polling continues
      expect(result).not.toEqual(
        expect.stringContaining('meta http-equiv="refresh"')
      )
      expect(result).toEqual(
        expect.stringContaining('Refresh virus scan status')
      )
    })

    test('Should show error summary and no Save and continue when a document is REJECTED', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return [TEST_DOCUMENTS[0]]
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
        if (key === sessionKeys.documents) return [TEST_DOCUMENTS[0]]
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

    test('Should render View file link only for COMPLETE documents', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return TEST_DOCUMENTS
        return null
      })
      vi.spyOn(documentClient, 'getStatus')
        .mockResolvedValueOnce({ scanStatus: 'COMPLETE' })
        .mockResolvedValueOnce({ scanStatus: 'PENDING' })

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
        expect.stringContaining('/accompanying-documents/UPLOAD-1/file')
      )
      expect(result).not.toEqual(
        expect.stringContaining('/accompanying-documents/UPLOAD-2/file')
      )
    })
  })

  describe('GET /accompanying-documents/{uploadId}/file', () => {
    beforeEach(() => {
      vi.spyOn(documentClient, 'streamFile').mockReset()
    })

    const buildBackendResponse = ({
      contentType = 'application/pdf',
      contentDisposition = 'attachment; filename="cert.pdf"',
      body = 'PDF file content'
    } = {}) => {
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(body))
          controller.close()
        }
      })
      const headerInit = {
        ...(contentType !== null && { 'content-type': contentType }),
        ...(contentDisposition !== null && {
          'content-disposition': contentDisposition
        })
      }
      return { headers: new Headers(headerInit), body: stream }
    }

    test('Should stream file with correct content headers when uploadId is in session', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return TEST_DOCUMENTS
        return null
      })
      const fileContent = 'PDF file content'
      vi.spyOn(documentClient, 'streamFile').mockResolvedValue(
        buildBackendResponse({
          contentType: 'application/pdf',
          contentDisposition: 'attachment; filename="cert.pdf"',
          body: fileContent
        })
      )

      const { statusCode, headers, payload } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/UPLOAD-1/file',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(headers['content-type']).toContain('application/pdf')
      expect(headers['content-disposition']).toBe(
        'attachment; filename="cert.pdf"'
      )
      expect(headers['x-content-type-options']).toBe('nosniff')
      expect(payload).toBe(fileContent)
      expect(documentClient.streamFile).toHaveBeenCalledWith(
        'UPLOAD-1',
        expect.any(String)
      )
    })

    test('Should return 404 and not call backend when uploadId is not in session', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return TEST_DOCUMENTS
        return null
      })
      vi.spyOn(documentClient, 'streamFile')

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/UPLOAD-UNKNOWN/file',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.notFound)
      expect(documentClient.streamFile).not.toHaveBeenCalled()
    })

    test('Should return 404 when no documents exist in the session', async () => {
      getSessionValue.mockReturnValue(null)
      vi.spyOn(documentClient, 'streamFile')

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/UPLOAD-1/file',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.notFound)
      expect(documentClient.streamFile).not.toHaveBeenCalled()
    })

    test('Should return 400 when uploadId contains invalid characters', async () => {
      vi.spyOn(documentClient, 'streamFile')

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/..%2F..%2Fetc%2Fpasswd/file',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(documentClient.streamFile).not.toHaveBeenCalled()
    })

    test.each([
      'image/jpeg',
      'image/png',
      'application/vnd.ms-excel',
      'application/msword',
      'application/octet-stream'
    ])('Should serve %s without downgrade', async (mimeType) => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return TEST_DOCUMENTS
        return null
      })
      vi.spyOn(documentClient, 'streamFile').mockResolvedValue(
        buildBackendResponse({ contentType: mimeType })
      )

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/UPLOAD-1/file',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(headers['content-type']).toContain(mimeType)
      expect(headers['x-content-type-options']).toBe('nosniff')
    })

    test('Should fall back to application/octet-stream for disallowed MIME types', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return TEST_DOCUMENTS
        return null
      })
      vi.spyOn(documentClient, 'streamFile').mockResolvedValue(
        buildBackendResponse({
          contentType: 'text/html',
          body: '<script>alert(1)</script>'
        })
      )

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/UPLOAD-1/file',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(headers['content-type']).toContain('application/octet-stream')
      expect(headers['x-content-type-options']).toBe('nosniff')
    })

    test('Should strip MIME type parameters before allow-list check', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return TEST_DOCUMENTS
        return null
      })
      vi.spyOn(documentClient, 'streamFile').mockResolvedValue(
        buildBackendResponse({ contentType: 'application/pdf; charset=utf-8' })
      )

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/UPLOAD-1/file',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(headers['content-type']).toContain('application/pdf')
    })

    test('Should fall back to application/octet-stream and attachment when backend returns no content headers', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return TEST_DOCUMENTS
        return null
      })
      vi.spyOn(documentClient, 'streamFile').mockResolvedValue(
        buildBackendResponse({ contentType: null, contentDisposition: null })
      )

      const { statusCode, headers } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/UPLOAD-1/file',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.ok)
      expect(headers['content-type']).toContain('application/octet-stream')
      expect(headers['content-disposition']).toBe('attachment')
    })

    test('Should return 500 when documentClient.streamFile throws', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return TEST_DOCUMENTS
        return null
      })
      vi.spyOn(documentClient, 'streamFile').mockRejectedValue(
        new Error('Backend error')
      )

      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/accompanying-documents/UPLOAD-1/file',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        }
      })

      expect(statusCode).toBe(statusCodes.internalServerError)
    })
  })

  describe('POST /accompanying-documents — remove action', () => {
    beforeEach(() => {
      vi.spyOn(documentClient, 'delete').mockResolvedValue(undefined)
    })

    test('Should delete from backend, update session, and redirect when _action is remove-{uploadId}', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return TEST_DOCUMENTS
        return null
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { _action: 'remove-UPLOAD-1' }
      })

      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/accompanying-documents')
      expect(documentClient.delete).toHaveBeenCalledWith(
        'UPLOAD-1',
        expect.any(String)
      )
      expect(setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.documents,
        [TEST_DOCUMENTS[1]]
      )
    })

    test('Should return 400 and not call delete when uploadId is not in session', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return TEST_DOCUMENTS
        return null
      })

      const { statusCode } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { _action: 'remove-UPLOAD-UNKNOWN' }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(documentClient.delete).not.toHaveBeenCalled()
      expect(setSessionValue).not.toHaveBeenCalled()
    })

    test('Should redirect without updating session when backend delete fails', async () => {
      vi.spyOn(documentClient, 'delete').mockRejectedValue(
        new Error('Backend error')
      )
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return TEST_DOCUMENTS
        return null
      })

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: { _action: 'remove-UPLOAD-1' }
      })

      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/accompanying-documents')
      expect(setSessionValue).not.toHaveBeenCalled()
    })
  })

  describe('POST /accompanying-documents — upload action', () => {
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
          'Document reference must only contain letters and numbers'
        )
      )
    })

    test('Should re-render with 400 and year error when issueDate-year is missing (partial date)', async () => {
      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          documentType: 'ITAHC',
          documentReference: 'REF001',
          'issueDate-day': 10,
          'issueDate-month': 3,
          'issueDate-year': ''
        }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining('Date of issue must include a year')
      )
    })

    test('Should re-render with 400 and real date error when calendar date is invalid (31 Feb 2024)', async () => {
      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          documentType: 'ITAHC',
          documentReference: 'REF001',
          'issueDate-day': 31,
          'issueDate-month': 2,
          'issueDate-year': 2024
        }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining('Enter a real date of issue')
      )
    })

    test('Should re-render with 400 and max-length error when documentReference exceeds 100 characters', async () => {
      const { statusCode, result } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents',
        auth: {
          strategy: 'session',
          credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
        },
        payload: {
          documentType: 'ITAHC',
          documentReference: 'a'.repeat(MAX_DOCUMENT_REFERENCE_LENGTH + 1),
          'issueDate-day': 10,
          'issueDate-month': 3,
          'issueDate-year': 2024
        }
      })

      expect(statusCode).toBe(statusCodes.badRequest)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining(
          'Document reference must be 100 characters or less'
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
          documentReference: 'REF001',
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
      const occurrences = (result.match(/Select a document type/g) ?? []).length
      // Error-summary item + field-error message = 2. Three would mean the
      // duplicate Joi error has regressed (Bug 3).
      expect(occurrences).toBe(2)
      expect(documentClient.initiate).not.toHaveBeenCalled()
    })

    test('Should re-render upload page with 400 and inline file-size error when file exceeds MAX_FILE_SIZE_BYTES but fits under the Hapi route cap', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return []
        if (key === sessionKeys.referenceNumber) return 'REF-WINDOW'
        return null
      })

      const boundary = '----TestBoundaryAppCap'
      const fileBody = Buffer.alloc(
        MAX_FILE_SIZE_BYTES + 1,
        FILLER_BYTE
      ).toString('binary')
      const body = buildMultipartBody(boundary, DEFAULT_MULTIPART_FIELDS, {
        fileBody,
        filename: 'just-over.pdf'
      })

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
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining('The selected file must be smaller than 10 MB')
      )
      // Only validationErrorView replays submitted fields — the onPreResponse
      // 413 fallback does not, so this pins the validateFile window path.
      expect(result).toEqual(expect.stringContaining('REF001'))
    })

    test('Should re-render upload page with 400 and inline file-size error when payload exceeds MAX_PAYLOAD_BYTES', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return [TEST_DOCUMENTS[0]]
        return null
      })
      vi.spyOn(documentClient, 'getStatus').mockResolvedValue({
        scanStatus: 'COMPLETE'
      })

      const boundary = '----TestBoundaryOversize'
      const oversizePadding = Buffer.alloc(
        MAX_PAYLOAD_BYTES + 1024,
        FILLER_BYTE
      ).toString('binary')
      const body = buildMultipartBody(boundary, [['documentType', 'ITAHC']], {
        fileBody: oversizePadding,
        filename: 'huge.pdf'
      })

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
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining('The selected file must be smaller than 10 MB')
      )
      // Existing documents must still be listed — the user has not lost state.
      expect(result).toEqual(expect.stringContaining('cert.pdf'))
      expect(result).toEqual(expect.stringContaining('REF-001'))
    })

    test('Should keep the CSRF crumb on the oversize re-render so a corrected re-submit passes validation when csrf is enabled', async () => {
      config.set('csrf.enabled', true)
      try {
        getSessionValue.mockImplementation((request, key) => {
          if (key === sessionKeys.documents) return []
          if (key === sessionKeys.referenceNumber) return 'REF-CSRF'
          return null
        })

        const crumbToken = 'csrf-test-crumb-token'
        const boundary = '----TestBoundaryOversizeCrumb'
        const oversizePadding = Buffer.alloc(
          MAX_PAYLOAD_BYTES + 1024,
          FILLER_BYTE
        ).toString('binary')
        const oversizeBody = buildMultipartBody(
          boundary,
          [['documentType', 'ITAHC']],
          { fileBody: oversizePadding, filename: 'huge.pdf' }
        )

        const oversizeResponse = await server.inject({
          method: 'POST',
          url: '/accompanying-documents',
          auth: {
            strategy: 'session',
            credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
          },
          headers: {
            'content-type': `multipart/form-data; boundary=${boundary}`,
            cookie: `crumb=${crumbToken}`
          },
          payload: Buffer.from(oversizeBody, 'binary')
        })

        expect(oversizeResponse.statusCode).toBe(statusCodes.badRequest)
        // The re-rendered form must replay the crumb — an empty hidden crumb
        // input would 403 the no-JS user's corrected re-submit.
        expect(oversizeResponse.result).toEqual(
          expect.stringContaining(`name="crumb" value="${crumbToken}"`)
        )

        const retryBoundary = '----TestBoundaryCrumbRetry'
        const retryBody = buildMultipartBody(retryBoundary, [
          ...DEFAULT_MULTIPART_FIELDS,
          ['crumb', crumbToken]
        ])

        const retryResponse = await server.inject({
          method: 'POST',
          url: '/accompanying-documents',
          auth: {
            strategy: 'session',
            credentials: { user: {}, sessionId: 'TEST_SESSION_ID' }
          },
          headers: {
            'content-type': `multipart/form-data; boundary=${retryBoundary}`,
            cookie: `crumb=${crumbToken}`
          },
          payload: Buffer.from(retryBody, 'binary')
        })

        expect(retryResponse.statusCode).toBe(statusCodes.redirectFound)
        expect(retryResponse.headers.location).toBe('/accompanying-documents')
      } finally {
        config.set('csrf.enabled', false)
      }
    })

    test('Should mint a CSRF crumb on the oversize re-render when the request has no crumb cookie and csrf is enabled', async () => {
      config.set('csrf.enabled', true)
      try {
        getSessionValue.mockImplementation((request, key) => {
          if (key === sessionKeys.documents) return []
          return null
        })

        const boundary = '----TestBoundaryOversizeNoCrumb'
        const oversizePadding = Buffer.alloc(
          MAX_PAYLOAD_BYTES + 1024,
          FILLER_BYTE
        ).toString('binary')
        const body = buildMultipartBody(boundary, [['documentType', 'ITAHC']], {
          fileBody: oversizePadding,
          filename: 'huge.pdf'
        })

        const { statusCode, result, headers } = await server.inject({
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
        expect(result).not.toEqual(
          expect.stringContaining('name="crumb" value=""')
        )
        // The minted crumb must be set as a cookie AND replayed in the form,
        // so the corrected re-submit's payload matches the cookie.
        const setCookie = [headers['set-cookie']].flat().join(';')
        const mintedCrumb = setCookie.match(/crumb=([^;]+)/)?.[1]
        expect(mintedCrumb).toBeTruthy()
        expect(result).toEqual(
          expect.stringContaining(`name="crumb" value="${mintedCrumb}"`)
        )
      } finally {
        config.set('csrf.enabled', false)
      }
    })

    test('Should accept a file of exactly MAX_FILE_SIZE_BYTES and redirect', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return []
        if (key === sessionKeys.referenceNumber) return 'REF-EXACT'
        return null
      })

      const boundary = '----TestBoundaryExactMax'
      const fileBody = Buffer.alloc(MAX_FILE_SIZE_BYTES, FILLER_BYTE).toString(
        'binary'
      )
      const body = buildMultipartBody(boundary, DEFAULT_MULTIPART_FIELDS, {
        fileBody,
        filename: 'exactly-max.pdf'
      })

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

      // Proves the multipart-envelope headroom (MAX_PAYLOAD_BYTES) admits an
      // exactly-max file and validateFile's strict > comparison accepts it —
      // a > to >= regression would 400 here instead of redirecting.
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/accompanying-documents')
      expect(documentClient.uploadFile).toHaveBeenCalled()
    })

    test('Should upload file, update session, and redirect on successful POST', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return []
        if (key === sessionKeys.referenceNumber) return 'REF-123'
        return null
      })

      const boundary = '----TestBoundary12345'
      const body = buildMultipartBody(boundary)

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

      expect(documentClient.initiate).toHaveBeenCalledWith(
        'REF-123',
        expect.objectContaining({
          documentType: 'ITAHC',
          documentReference: 'REF001',
          dateOfIssue: '2024-03-10'
        }),
        expect.any(String)
      )
      expect(documentClient.uploadFile).toHaveBeenCalledWith(
        'TEST-UPLOAD-ID',
        expect.any(FormData),
        expect.any(String)
      )
      expect(setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        sessionKeys.documents,
        expect.arrayContaining([
          expect.objectContaining({
            uploadId: 'TEST-UPLOAD-ID',
            documentType: 'ITAHC',
            documentReference: 'REF001',
            dateOfIssue: '2024-03-10'
          })
        ])
      )
      expect(statusCode).toBe(statusCodes.redirectFound)
      expect(headers.location).toBe('/accompanying-documents')
    })

    test('Should re-render with 500 and error message and NOT call setSessionValue when upload returns error status', async () => {
      vi.spyOn(documentClient, 'uploadFile').mockRejectedValueOnce(
        Object.assign(new Error('Upload failed'), { status: 500 })
      )
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return []
        if (key === sessionKeys.referenceNumber) return 'REF-123'
        return null
      })

      const boundary = '----TestBoundary99999'
      const body = buildMultipartBody(boundary)

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

      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining('The file could not be uploaded. Try again.')
      )
      expect(setSessionValue).not.toHaveBeenCalled()
    })

    test('Should re-render with 500 and upload error when documentClient.initiate rejects', async () => {
      vi.spyOn(documentClient, 'initiate').mockRejectedValueOnce(
        new Error('Backend unavailable')
      )
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return []
        if (key === sessionKeys.referenceNumber) return 'REF-123'
        return null
      })

      const boundary = '----TestBoundaryInitFail'
      const body = buildMultipartBody(boundary)

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

      expect(statusCode).toBe(statusCodes.internalServerError)
      expect(result).toEqual(expect.stringContaining('There is a problem'))
      expect(result).toEqual(
        expect.stringContaining('The file could not be uploaded. Try again.')
      )
      expect(setSessionValue).not.toHaveBeenCalled()
    })

    test('Should return 400 with error message when 10 documents already in session', async () => {
      const tenDocuments = Array.from({ length: MAX_DOCUMENTS }, (_, i) => ({
        uploadId: `UPLOAD-${i}`,
        filename: `doc${i}.pdf`,
        documentType: 'ITAHC',
        documentReference: `REF-00${i}`,
        dateOfIssue: '2026-01-01'
      }))
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return tenDocuments
        return null
      })
      vi.spyOn(documentClient, 'getStatus').mockResolvedValue({
        scanStatus: 'COMPLETE'
      })

      const boundary = '----TestBoundaryLimit'
      const body = buildMultipartBody(boundary)

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
        expect.stringContaining(
          `You can add a maximum of ${MAX_DOCUMENTS} documents`
        )
      )
    })
  })

  describe('GET /accompanying-documents/status', () => {
    test('Should return JSON with documents and their statuses when documents are in session', async () => {
      getSessionValue.mockImplementation((request, key) => {
        if (key === sessionKeys.documents) return TEST_DOCUMENTS
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
