import { describe, expect, it } from 'vitest'
import { RefusedCallError } from './dependency-error.js'

describe('#RefusedCallError', () => {
  it('Should carry the refused call and the answer as its own fields, and name both in its message', () => {
    const err = new RefusedCallError(
      {
        dependency: 'animals-backend',
        operation: 'get-document-upload-status'
      },
      { status: 503, statusText: 'Service Unavailable' }
    )

    expect(err).toMatchObject({
      name: 'RefusedCallError',
      dependency: 'animals-backend',
      operation: 'get-document-upload-status',
      status: 503,
      statusText: 'Service Unavailable',
      message:
        'animals-backend refused to get document upload status: 503 Service Unavailable'
    })
  })
})
