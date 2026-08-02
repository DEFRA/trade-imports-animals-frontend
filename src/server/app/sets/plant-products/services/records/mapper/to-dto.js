const mapOrigin = (answers) => {
  const origin = {
    ...(answers.countryOfOrigin
      ? { countryCode: answers.countryOfOrigin }
      : {}),
    ...(answers.countryOfConsignment
      ? { countryOfConsignmentCode: answers.countryOfConsignment }
      : {}),
    ...(answers.internalReference
      ? { internalReference: answers.internalReference }
      : {})
  }
  return Object.keys(origin).length > 0 ? { origin } : {}
}

const SECTION_MAPPERS = Object.freeze([mapOrigin])

const composeSections = (answers) =>
  SECTION_MAPPERS.reduce(
    (dto, mapSection) => ({ ...dto, ...mapSection(answers) }),
    {}
  )

export const toDto = (answers = {}) => composeSections(answers ?? {})
