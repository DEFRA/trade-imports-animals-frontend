import { isRealMode } from '../mode.js'
import { documentUploads as stubUploads } from './stub.js'
import { documentUploads as realUploads } from './real.js'

export const documentUploads = isRealMode() ? realUploads : stubUploads
