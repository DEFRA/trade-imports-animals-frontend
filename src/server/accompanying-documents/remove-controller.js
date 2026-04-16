import {
  getSessionValue,
  setSessionValue
} from '../common/helpers/session-helpers.js'

export const removeDocumentController = {
  post: {
    handler(request, h) {
      const { uploadId } = request.payload
      const documents = getSessionValue(request, 'documents') ?? []
      setSessionValue(
        request,
        'documents',
        documents.filter((d) => d.uploadId !== uploadId)
      )
      return h.redirect('/accompanying-documents')
    }
  }
}
