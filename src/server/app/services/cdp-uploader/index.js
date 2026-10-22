import { isStubMode } from '../../../common/services/mode.js'
import {
  documentUploadSessions as stubSessions,
  stubUploadRoutes
} from './stub.js'
import { documentUploadSessions as realSessions } from './real.js'

const sessionService = () => (isStubMode() ? stubSessions : realSessions)

export const documentUploadSessions = {
  open: (session) => sessionService().open(session),
  read: (uploadId) => sessionService().read(uploadId)
}

export const documentUploadRoutes = () =>
  isStubMode() ? [stubUploadRoutes] : []
