const mapOrigin = (answers) =>
  answers.countryOfOrigin
    ? { origin: { countryCode: answers.countryOfOrigin } }
    : {}

const SECTION_MAPPERS = Object.freeze([mapOrigin])

const composeSections = (answers) =>
  SECTION_MAPPERS.reduce(
    (dto, mapSection) => ({ ...dto, ...mapSection(answers) }),
    {}
  )

export const toDto = (answers = {}) => composeSections(answers ?? {})
