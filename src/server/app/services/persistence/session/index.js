import { isStubMode } from '../../../../common/services/mode.js'
import { session as stubSession } from './stub.js'
import { session as realSession } from './real.js'

export const session = isStubMode() ? stubSession : realSession
