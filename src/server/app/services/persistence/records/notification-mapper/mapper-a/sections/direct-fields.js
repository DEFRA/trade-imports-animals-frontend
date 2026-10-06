import { obligationSet } from '../../../../../../model/obligations/manifest.js'
import { instantFromDateParts } from '../../../../../../lib/validate/index.js'
import { compact, orUndefined } from '../../shared/compact.js'

const toParty = (answer) =>
  orUndefined(
    compact({
      name: answer?.name,
      email: answer?.email,
      phone: answer?.phone,
      address: answer?.address
    })
  )

export const directFieldsFromFulfilment = (reader, referenceNumber) => {
  const {
    consignee,
    consignor,
    contactAddress,
    cph,
    importer,
    placeOfDestination,
    placeOfOrigin,
    reasonForImport,
    purposeInInternalMarket,
    destinationCountry,
    portOfExit,
    exitDate
  } = obligationSet()
  return compact({
    referenceNumber,
    reasonForImport: reader.scalar(reasonForImport),
    placeOfOrigin: toParty(reader.scalar(placeOfOrigin)),
    consignor: toParty(reader.scalar(consignor)),
    consignee: toParty(reader.scalar(consignee)),
    importer: toParty(reader.scalar(importer)),
    destination: toParty(reader.scalar(placeOfDestination)),
    consignment: toParty(reader.scalar(contactAddress)),
    cphNumber: reader.scalar(cph),
    purposeInInternalMarket: reader.scalar(purposeInInternalMarket),
    destinationCountry: reader.scalar(destinationCountry),
    portOfExit: reader.scalar(portOfExit),
    exitDate: instantFromDateParts(reader.scalar(exitDate))
  })
}
