import { isStubMode } from '../../../common/services/mode.js'
import { documentUploadSessions as stubSessions } from './stub.js'
import { documentUploadSessions as realSessions } from './real.js'

export const documentUploadSessions = isStubMode() ? stubSessions : realSessions
