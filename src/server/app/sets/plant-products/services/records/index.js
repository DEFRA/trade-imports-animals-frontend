import { isRealMode } from '../mode.js'
import { records as realRecords } from './real.js'
import { records as stubRecords } from './stub.js'

export const records = isRealMode() ? realRecords : stubRecords
