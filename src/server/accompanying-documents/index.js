import { accompanyingDocumentsController } from './controller.js'
import { removeDocumentController } from './remove-controller.js'
import { config } from '../../config/config.js'

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
          method: 'POST',
          path: '/accompanying-documents',
          options: {
            handler: accompanyingDocumentsController.post.handler,
            payload: {
              maxBytes: 52428800,
              parse: true,
              multipart: { output: 'annotated' }
            }
          }
        },
        {
          method: 'POST',
          path: '/accompanying-documents/remove',
          options: authEnabled
            ? { auth: { strategy: 'session', mode: 'try' } }
            : { auth: false },
          ...removeDocumentController.post
        }
      ])
    }
  }
}
