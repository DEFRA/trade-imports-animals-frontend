const openThisPageByGet = () =>
  globalThis.location.replace(globalThis.location.href)

/**
 * Opens the page again whenever the browser hands back a copy it had kept, so the add form's
 * upload session is one the upload service will still take a file for.
 */
export const reopenWhenRestoredFromHistory = () => {
  globalThis.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      openThisPageByGet()
    }
  })
}
