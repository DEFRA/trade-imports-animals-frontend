import { documentUploads as realUploads } from '../../../../services/document-uploads/real.js'
import { documentUploads as stubUploads } from '../../../../services/document-uploads/stub.js'
import { isRealMode } from '../mode.js'

export const documentUploads = isRealMode() ? realUploads : stubUploads
