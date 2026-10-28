const openThisPageByGet = () =>
  globalThis.location.replace(globalThis.location.href)

/**
 * Opens the page again whenever the browser hands back a copy it had kept.
 */
export const reopenWhenRestoredFromHistory = () => {
  globalThis.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      openThisPageByGet()
    }
  })
}
