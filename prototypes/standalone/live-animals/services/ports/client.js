const referenceDataUrl =
  process.env.REFERENCE_DATA_URL ?? 'http://localhost:8086'

export const fetchPortsOfEntry = async () => {
  const response = await fetch(`${referenceDataUrl}/ports-of-entry`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok) {
    const error = new Error('Failed to get ports of entry')
    error.status = response.status
    error.statusText = response.statusText
    throw error
  }

  return response.json()
}
