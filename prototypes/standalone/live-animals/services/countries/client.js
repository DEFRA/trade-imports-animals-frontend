const referenceDataUrl =
  process.env.REFERENCE_DATA_URL ?? 'http://localhost:8086'

export const fetchCountries = async () => {
  const response = await fetch(`${referenceDataUrl}/countries`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok) {
    const error = new Error('Failed to get countries')
    error.status = response.status
    error.statusText = response.statusText
    throw error
  }

  return response.json()
}
