import * as addressBook from '../../../../../services/address-book/index.js'

export const NOTIFICATION_CONSIGNOR_ID = 'notification-consignor'

const trimmed = (value) => String(value ?? '').trim()

// Not invented data: this is what the user typed into consignor-create, read
// back off the notification so the consignor already on it stays pickable.
const notificationConsignor = (answers) => {
  const name = trimmed(answers?.consignorName)
  if (name === '') return undefined

  return {
    id: NOTIFICATION_CONSIGNOR_ID,
    name,
    telephone: trimmed(answers.consignorTelephone),
    email: trimmed(answers.consignorEmail),
    address: {
      addressLine1: trimmed(answers.consignorAddressLine1),
      addressLine2: trimmed(answers.consignorAddressLine2),
      addressLine3: trimmed(answers.consignorAddressLine3),
      city: trimmed(answers.consignorCity),
      postcode: trimmed(answers.consignorPostcode),
      country: trimmed(answers.consignorCountry)
    }
  }
}

const ADDRESS_PARTS = [
  'addressLine1',
  'addressLine2',
  'addressLine3',
  'city',
  'postcode',
  'country'
]

const sameAddress = (first, second) =>
  ADDRESS_PARTS.every(
    (part) => trimmed(first?.[part]) === trimmed(second?.[part])
  )

const duplicatesNotification = (record, onNotification) =>
  onNotification !== undefined &&
  record.name === onNotification.name &&
  sameAddress(record.address, onNotification.address)

export const candidates = async (request, answers) => {
  const onNotification = notificationConsignor(answers)
  const saved = await addressBook.list(request)
  const rest = saved.filter(
    (record) => !duplicatesNotification(record, onNotification)
  )

  return onNotification ? [onNotification, ...rest] : rest
}
