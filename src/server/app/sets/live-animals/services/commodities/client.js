const referenceDataUrl =
  process.env.TRADE_IMPORTS_REFERENCE_DATA_URL ?? 'http://localhost:8086'

export const fetchCommodities = async (term, { page, size }) => {
  const url = new URL(`${referenceDataUrl}/commodities`)
  url.searchParams.set('search', term)
  url.searchParams.set('page', String(page))
  url.searchParams.set('size', String(size))

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' }
  })

  if (!response.ok) {
    throw Object.assign(new Error('Failed to search commodities'), {
      status: response.status,
      statusText: response.statusText
    })
  }

  return response.json()
}
