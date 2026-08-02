const SECTION_MAPPERS = Object.freeze([])

const composeSections = (dto) =>
  SECTION_MAPPERS.reduce(
    (answers, mapSection) => ({ ...answers, ...mapSection(dto) }),
    {}
  )

export const fromDto = (dto = {}) => composeSections(dto ?? {})
