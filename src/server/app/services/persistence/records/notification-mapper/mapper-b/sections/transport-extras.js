import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { compact } from '../../shared/compact.js'

export const applyTransportExtrasOverlay = (notification, reader) => {
  const {
    meansOfTransport,
    transitedCountries,
    transportDocumentReference,
    transportIdentification
  } = obligationSet()
  const transportExtras = compact({
    meansOfTransport: reader.scalar(meansOfTransport),
    transportIdentification: reader.scalar(transportIdentification),
    transportDocumentReference: reader.scalar(transportDocumentReference),
    transitedCountries: reader.scalar(transitedCountries)
  })
  if (Object.keys(transportExtras).length > 0) {
    notification.transport = {
      ...notification.transport,
      ...transportExtras
    }
  }
}
