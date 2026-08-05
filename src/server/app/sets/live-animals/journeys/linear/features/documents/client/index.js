import { initUploadForm } from './oversize-validation/submit.js'
import { startPolling } from './scan-status/poll.js'

startPolling()
initUploadForm()
