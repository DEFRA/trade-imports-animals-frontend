/**
 * The day an instant falls on in Europe/London, written out in full.
 *
 * @param {string|number|Date} instant - a UTC instant, such as `submittedAt`
 * @returns {string} the date, such as `11 September 2026`
 */
export const notificationDateText = (instant) =>
  new Date(instant).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Europe/London'
  })
