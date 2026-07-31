import {
  meansOfTransport,
  transitedCountries,
  transportDocumentReference,
  transportIdentification
} from '../../../../../../model/obligations/obligations.js'
import { compact } from '../../shared/compact.js'

export const applyTransportExtrasOverlay = (notification, reader) => {
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
