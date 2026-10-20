const baseUrl =
  process.env.TRADE_IMPORTS_REFERENCE_DATA_URL ?? 'http://localhost:8086'

export const referenceDataUrl = (path) => new URL(`${baseUrl}${path}`)

export const requestReferenceData = async (url, init, failureMessage) => {
  const response = await fetch(url.toString(), {
    ...init,
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok) {
    throw Object.assign(new Error(failureMessage), {
      status: response.status,
      statusText: response.statusText
    })
  }

  return response.json()
}
