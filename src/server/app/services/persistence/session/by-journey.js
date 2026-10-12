export const withEntry = (byJourney, journeyId, value) => {
  const { [journeyId]: _previous, ...rest } = byJourney
  return value === undefined ? rest : { ...rest, [journeyId]: value }
}
