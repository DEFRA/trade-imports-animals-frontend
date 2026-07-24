import { statusHandler } from './status.js'
import { getHandler } from './get.js'
import { uploadSuccessfulHandler } from './upload-successful.js'
import { download } from './download/index.js'
import { postHandler } from './post/index.js'

export { MAX_POLLING_ATTEMPTS } from './page-model.js'

export const accompanyingDocumentsController = {
  status: { handler: statusHandler },
  get: { handler: getHandler },
  uploadSuccessful: { handler: uploadSuccessfulHandler },
  download,
  post: { handler: postHandler }
}
