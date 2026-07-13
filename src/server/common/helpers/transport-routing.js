const MEANS_REQUIRING_TRANSIT = new Set(['RAILWAY', 'ROAD_VEHICLE'])

export function requiresTransitedCountries(meansOfTransport) {
  return MEANS_REQUIRING_TRANSIT.has(meansOfTransport)
}

export function nextRouteAfterArrivalDetails(meansOfTransport) {
  return requiresTransitedCountries(meansOfTransport)
    ? '/transited-countries'
    : '/transporters'
}
