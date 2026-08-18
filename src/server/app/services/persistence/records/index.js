import { isStubMode } from '../../../../common/services/mode.js'
import { records as stubRecords } from './stub/index.js'
import { records as realRecords } from './real/index.js'

export const records = isStubMode() ? stubRecords : realRecords
