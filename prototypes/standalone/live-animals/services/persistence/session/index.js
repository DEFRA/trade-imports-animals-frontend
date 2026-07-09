import { session as stubSession } from './stub.js'

// Selected persistence impl. Stub-only until a durable client lands, at which
// point select on the run mode here:
//   import { isRealMode } from '../../mode.js'
//   export const session = isRealMode() ? realSession : stubSession
export const session = stubSession
