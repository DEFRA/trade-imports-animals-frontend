/**
 * About you — the obligations this feature owns. Pure data; imports
 * nothing outward (see the purity note in email/obligations.js).
 *
 * `fullName` is the ONLY save-blocking (hard) mandate in the whole journey —
 * but that is expressed as a controller-owned Joi rule (`about-you`'s
 * `requiredText`), not an obligation flag. `required` here is the completion fact the
 * status roll-up reads ("what is owed"), deliberately distinct from save-time
 * validation.
 */
export const fullName = { id: 'fullName', required: true }
export const preferredName = { id: 'preferredName' }
export const phone = { id: 'phone' }
export const postcode = { id: 'postcode' }
export const country = { id: 'country' }
export const dateOfBirth = { id: 'dateOfBirth' }

export const obligations = [
  fullName,
  preferredName,
  phone,
  postcode,
  country,
  dateOfBirth
]
