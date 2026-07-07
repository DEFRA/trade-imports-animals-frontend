/**
 * `required` is the completion fact the status roll-up reads ("what is
 * owed") — it does NOT block save. Save-blocking is controller-owned
 * validation; fullName's `requiredText` is the journey's only one.
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
