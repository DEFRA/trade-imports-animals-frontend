/** A per-journey map with `journeyId` set to `value`, or dropped when `value`
 * is undefined, so a cleared entry leaves no key behind in the session. */
export const withEntry = (byJourney, journeyId, value) => {
  const { [journeyId]: _previous, ...rest } = byJourney
  return value === undefined ? rest : { ...rest, [journeyId]: value }
}
