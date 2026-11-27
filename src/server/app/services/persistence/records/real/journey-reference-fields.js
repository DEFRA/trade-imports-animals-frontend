export const journeyReferenceFields = (journeyId) =>
  journeyId == null ? {} : { event: { reference: journeyId } }
