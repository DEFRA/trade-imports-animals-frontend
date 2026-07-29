export const announcer = () =>
  document.getElementById('js-scan-status-announcer')

export const readScanCopy = () => {
  const raw = announcer()?.dataset.scanCopy
  return raw ? JSON.parse(raw) : {}
}

export const announce = (message) => {
  const region = announcer()
  if (region && message) {
    region.textContent = message
  }
}
