import { statusHandler } from './status.js'
import { getHandler } from './get.js'
import { download } from './download/index.js'
import { postHandler } from './post/index.js'

export { MAX_POLLING_ATTEMPTS } from './page-model.js'

export const accompanyingDocumentsController = {
  status: { handler: statusHandler },
  get: { handler: getHandler },
  download,
  post: { handler: postHandler }
}
