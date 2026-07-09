import { isRealMode } from '../../mode.js'
import { session as stubSession } from './stub.js'
import { session as realSession } from './real.js'

export const session = isRealMode() ? realSession : stubSession
