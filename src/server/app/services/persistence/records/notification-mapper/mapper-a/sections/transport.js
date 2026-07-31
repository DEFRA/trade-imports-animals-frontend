import {
  arrivalDateAtPort,
  commercialTransporter,
  portOfEntry,
  privateTransporter,
  transporterType
} from '../../../../../../model/obligations/obligations.js'
import { compact, orUndefined } from '../../shared/compact.js'
import { isoFromDateParts } from '../../shared/iso-date.js'

export const transporterFromFulfilment = (reader) => {
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

export const transportFromFulfilment = (reader) =>
  orUndefined(
    compact({
      portOfEntry: reader.scalar(portOfEntry),
      arrivalDate: isoFromDateParts(reader.scalar(arrivalDateAtPort)),
      transporter: transporterFromFulfilment(reader)
    })
  )
