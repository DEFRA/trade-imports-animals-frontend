const referenceDataUrl =
  process.env.REFERENCE_DATA_URL ?? 'http://localhost:8086'

export const fetchCountries = async () => {
  const response = await fetch(`${referenceDataUrl}/countries`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok) {
    throw Object.assign(new Error('Failed to get countries'), {
      status: response.status,
      statusText: response.statusText
    })
  }

  return response.json()
}
