import { parentCountryCode } from '../../../../../countries/index.js'
import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { isoDateFromDateParts } from '../../../../../../lib/validate/index.js'
import { compact, orUndefined } from '../../shared/compact.js'

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

// GBN-AG's transit countries are ISO 3166-1 alpha-2 codes, one per country, so
// a territory travels as its country and a country is named once.
const asCountryCodes = (codes) =>
  Array.isArray(codes) ? [...new Set(codes.map(parentCountryCode))] : codes

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
      arrivalDate: isoDateFromDateParts(reader.scalar(arrivalDateAtPort)),
      transporter: transporterFromFulfilment(reader),
      meansOfTransport: unlessBlank(reader.scalar(meansOfTransport)),
      transportIdentification: unlessBlank(
        reader.scalar(transportIdentification)
      ),
      transportDocumentReference: unlessBlank(
        reader.scalar(transportDocumentReference)
      ),
      transitedCountries: asCountryCodes(reader.scalar(transitedCountries))
    })
  )
}
