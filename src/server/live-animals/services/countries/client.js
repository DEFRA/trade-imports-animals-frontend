const referenceDataUrl =
  process.env.REFERENCE_DATA_URL ?? 'http://localhost:8086'

export const fetchCountries = async (blocks) => {
  const url = new URL(`${referenceDataUrl}/countries`)

  if (blocks?.length) {
    for (const block of blocks) {
      url.searchParams.append('blocks', block)
    }
  }

  const response = await fetch(url.toString(), {
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
