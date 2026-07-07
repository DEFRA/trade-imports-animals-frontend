/**
 * SESSION — the session/identity port. Answers two questions: "who is the user"
 * and "which journey is active this session". Both are STUBS.
 *
 * Honest collapse: in prod the cookie carries an opaque session id and Redis
 * maps session -> journeyId; this stub puts the journeyId STRAIGHT in the cookie,
 * collapsing that one indirection so the cookie IS the active-journey pointer.
 * That keeps the seeded `state: { [JOURNEY_COOKIE]: journeyId }` in the existing
 * tests resolving unchanged (byte-green). The cookie NAME lives here and its
 * literal value is UNCHANGED from the pre-reshape `journey.js`.
 *
 * `userId` returns a single constant stub user (prod: the validated OIDC `sub`
 * from Defra ID), with an `x-stub-user` header override so a test can play a
 * second user cheaply. NO real OIDC, token validation, Redis or multi-user auth.
 */
export const STUB_USER = 'stub-user-0001'
export const STUB_USER_HEADER = 'x-stub-user'
export const JOURNEY_COOKIE = 'obligationsV2JourneyId'

export const session = {
  /**
   * The current user. Stub: constant STUB_USER, overridable via the
   * `x-stub-user` request header (test-only second-user switch).
   * Prod seam: the validated OIDC subject from Defra ID.
   */
  userId(request) {
    return request?.headers?.[STUB_USER_HEADER] ?? STUB_USER
  },

  /**
   * The active journey pointer for this session. Stub: read the cookie.
   * Prod seam: Redis GET session:{sid}.
   */
  activeJourneyId(request) {
    return request?.state?.[JOURNEY_COOKIE]
  },

  /**
   * Pin the active journey for this session. Stub: set the cookie.
   * Prod seam: Redis SET session:{sid}.
   */
  setActiveJourney(h, journeyId) {
    h.state(JOURNEY_COOKIE, journeyId)
  },

  /**
   * Drop the active-journey pointer. Stub: clear the cookie.
   * Prod seam: Redis DEL session:{sid}.
   */
  clearActive(h) {
    h.unstate(JOURNEY_COOKIE)
  }
}
