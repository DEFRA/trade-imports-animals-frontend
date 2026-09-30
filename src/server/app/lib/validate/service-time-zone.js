/**
 * The zone this service reasons in, and renders *moments* in. A code constant,
 * not config: the displayed date must be a property of the code, not of
 * whichever `TZ` the container happens to carry — that differs between
 * production (`Europe/London`), CI (`TZ=UTC`) and a laptop, and can be dropped.
 *
 * Calendar dates do not go through this — see `formatCalendarDate` in
 * `calendar.js`, which re-exports this constant so nothing else need know the
 * split.
 *
 * It sits in its own module so that a test can substitute it. Whether a
 * renderer depends on the service zone is a property only a *different*
 * service zone can show, and `Europe/London` is never behind UTC — so with the
 * constant inlined in `calendar.js` a converting implementation and a
 * non-converting one give the same answer for every calendar date, and the
 * claim that `formatCalendarDate` does not depend on this value would be
 * untestable.
 */
export const SERVICE_TIME_ZONE = 'Europe/London'
