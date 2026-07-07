/**
 * SESSION — the session/identity port (stub): who is the user, and which
 * journey is active this session.
 */
export const STUB_USER = 'stub-user-0001'
export const STUB_USER_HEADER = 'x-stub-user'
export const JOURNEY_COOKIE = 'liveAnimalsJourneyId'

export const session = {
  userId(request) {
    return request?.headers?.[STUB_USER_HEADER] ?? STUB_USER
  },

  activeJourneyId(request) {
    return request?.state?.[JOURNEY_COOKIE]
  },

  setActiveJourney(h, journeyId) {
    h.state(JOURNEY_COOKIE, journeyId)
  },

  clearActive(h) {
    h.unstate(JOURNEY_COOKIE)
  }
}
