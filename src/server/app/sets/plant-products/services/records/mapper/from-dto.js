const mapOrigin = (dto) => ({
  ...(dto.origin?.countryCode
    ? { countryOfOrigin: dto.origin.countryCode }
    : {}),
  ...(dto.origin?.countryOfConsignmentCode
    ? { countryOfConsignment: dto.origin.countryOfConsignmentCode }
    : {}),
  ...(dto.origin?.internalReference
    ? { internalReference: dto.origin.internalReference }
    : {})
})

const SECTION_MAPPERS = Object.freeze([mapOrigin])

const composeSections = (dto) =>
  SECTION_MAPPERS.reduce(
    (answers, mapSection) => ({ ...answers, ...mapSection(dto) }),
    {}
  )

export const fromDto = (dto = {}) => composeSections(dto ?? {})
