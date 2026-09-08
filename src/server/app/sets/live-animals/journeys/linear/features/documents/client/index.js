import { createAll, FileUpload } from 'govuk-frontend'

import { initUploadForm } from './oversize-validation/submit.js'
import { startPolling } from './scan-status/poll.js'

// Enhance the file input into a drop zone before anything else reads the DOM:
// the component renames the input and puts a button in front of it.
createAll(FileUpload)

startPolling()
initUploadForm()
