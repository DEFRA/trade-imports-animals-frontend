import { initUploadForm } from './oversize-validation/submit.js'
import { startPolling } from './scan-status/poll.js'

// Two independent progressive enhancements over a page that already works
// without either. Neither is allowed to take the other down with it, and the
// failure is rethrown out of band so it still reaches the browser's error
// handling rather than being swallowed here.
const start = (enhancement) => {
  try {
    enhancement()
  } catch (error) {
    setTimeout(() => {
      throw error
    })
  }
}

start(startPolling)
start(initUploadForm)
