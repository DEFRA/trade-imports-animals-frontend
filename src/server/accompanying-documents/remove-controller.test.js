import { vi } from 'vitest'

import { createServer } from '../server.js'
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

describe('#removeDocumentController', () => {
  let server

  beforeAll(async () => {
    server = await createServer()
    await server.initialize()
  })

  afterAll(async () => {
    await server.stop({ timeout: 0 })
    vi.restoreAllMocks()
  })

  describe('POST /accompanying-documents/remove', () => {
    test('Should remove the matching document and redirect to /accompanying-documents', async () => {
      getSessionValue.mockReturnValue([
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
      ])

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents/remove',
        payload: { uploadId: 'UPLOAD-1' }
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/accompanying-documents')
      expect(setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        'documents',
        [
          {
            uploadId: 'UPLOAD-2',
            filename: 'health.pdf',
            documentType: 'VETERINARY_HEALTH_CERTIFICATE',
            documentReference: 'REF-002',
            dateOfIssue: '2026-02-01'
          }
        ]
      )
    })

    test('Should handle removing from an empty list gracefully', async () => {
      getSessionValue.mockReturnValue([])

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents/remove',
        payload: { uploadId: 'UPLOAD-999' }
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/accompanying-documents')
      expect(setSessionValue).toHaveBeenCalledWith(
        expect.anything(),
        'documents',
        []
      )
    })

    test('Should handle missing session documents gracefully', async () => {
      getSessionValue.mockReturnValue(null)

      const { statusCode, headers } = await server.inject({
        method: 'POST',
        url: '/accompanying-documents/remove',
        payload: { uploadId: 'UPLOAD-1' }
      })

      expect(statusCode).toBe(302)
      expect(headers.location).toBe('/accompanying-documents')
    })
  })
})
