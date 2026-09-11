import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { compact, orUndefined } from '../../shared/compact.js'
import { isoFromDateParts } from '../../shared/iso-date.js'

export const transporterFromFulfilment = (reader) => {
  const { commercialTransporter, privateTransporter, transporterType } =
    obligationSet()
  const source =
    reader.scalar(commercialTransporter) ?? reader.scalar(privateTransporter)
  return orUndefined(
    compact({
      name: source?.name,
      address: source?.address,
      approvalNumber: source?.approvalNumber,
      type: reader.scalar(transporterType)
    })
  )
}

// The arrival-details page saves an unanswered field as '', which the backend
// cannot read as a means-of-transport enum.
const unlessBlank = (value) => (value === '' ? undefined : value)

export const transportFromFulfilment = (reader) => {
  const {
    arrivalDateAtPort,
    portOfEntry,
    meansOfTransport,
    transportIdentification,
    transportDocumentReference,
    transitedCountries
  } = obligationSet()
  return orUndefined(
    compact({
      portOfEntry: reader.scalar(portOfEntry),
      arrivalDate: isoFromDateParts(reader.scalar(arrivalDateAtPort)),
      transporter: transporterFromFulfilment(reader),
      meansOfTransport: unlessBlank(reader.scalar(meansOfTransport)),
      transportIdentification: unlessBlank(
        reader.scalar(transportIdentification)
      ),
      transportDocumentReference: unlessBlank(
        reader.scalar(transportDocumentReference)
      ),
      transitedCountries: reader.scalar(transitedCountries)
    })
  )
}
