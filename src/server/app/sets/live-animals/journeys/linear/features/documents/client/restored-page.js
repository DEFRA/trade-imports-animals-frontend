const openThisPageByGet = () =>
  globalThis.location.replace(globalThis.location.href)

export const reopenWhenRestoredFromHistory = () => {
  globalThis.addEventListener('pageshow', (event) => {
    if (event.persisted) {
      openThisPageByGet()
    }
  })
}
