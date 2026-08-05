import { assembleFulfilments } from '../../../../bridge/assemble-fulfilments.js'
import { SUBMITTED } from '../../../../engine/persistence/records.js'
import { fromDto } from './mapper/from-dto.js'
import { mapStatus } from './status.js'

export const marshal = (dto) => {
  const status = mapStatus(dto.status)
  return {
    journeyId: dto.referenceNumber,
    status,
    createdAt: dto.created ?? null,
    submittedAt:
      status === SUBMITTED ? (dto.declaration?.declaredAt ?? null) : null,
    fulfilment: assembleFulfilments(fromDto(dto))
  }
}

export const marshalListItem = (dto) => {
  const status = mapStatus(dto.status)
  return {
    journeyId: dto.referenceNumber,
    status,
    createdAt: dto.created ?? null,
    submittedAt:
      status === SUBMITTED ? (dto.declaration?.declaredAt ?? null) : null,
    originCountryCode: dto.origin?.countryCode ?? null,
    arrivalDate: dto.transport?.arrivalDate ?? null
  }
}
