const mapOrigin = (dto) =>
  dto.origin?.countryCode ? { countryOfOrigin: dto.origin.countryCode } : {}

const SECTION_MAPPERS = Object.freeze([mapOrigin])

const composeSections = (dto) =>
  SECTION_MAPPERS.reduce(
    (answers, mapSection) => ({ ...answers, ...mapSection(dto) }),
    {}
  )

export const fromDto = (dto = {}) => composeSections(dto ?? {})
