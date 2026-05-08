import { accompanyingDocumentsController } from './controller/index.js'
import { config } from '../../config/config.js'
import { MAX_PAYLOAD_BYTES } from './document-upload-config.js'

/**
 * Sets up the routes used in the accompanying documents page.
 * These routes are registered in src/server/router.js.
 */
export const accompanyingDocuments = {
  plugin: {
    name: 'accompanying-documents',
    register(server) {
      const authEnabled = config.get('auth.enabled')
      server.route([
        {
          method: 'GET',
          path: '/accompanying-documents',
          ...accompanyingDocumentsController.get
        },
        {
          method: 'GET',
          path: '/accompanying-documents/status',
          options: authEnabled
            ? { auth: { strategy: 'session', mode: 'try' } }
            : { auth: false },
          ...accompanyingDocumentsController.status
        },
        {
          method: 'GET',
          path: '/accompanying-documents/{uploadId}/file',
          ...accompanyingDocumentsController.download
        },
        {
          method: 'POST',
          path: '/accompanying-documents',
          options: {
            // Spread only handler so route-level payload config takes precedence over any controller options
            handler: accompanyingDocumentsController.post.handler,
            payload: {
              maxBytes: MAX_PAYLOAD_BYTES,
              parse: true,
              multipart: { output: 'annotated' }
            }
          }
        }
      ])
    }
  }
}
