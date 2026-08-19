/**
 * Lighthouse walks party pickers by scraping the first `party` radio. Those
 * radios only render when the signed-in org has at least one address in the
 * real address-book service (stack). Create one via the API when the book is
 * empty — same approach as the tests-repo e2e globalSetup, but one record only.
 */
const ORGANISATION_ID = '5900001'
const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'
const HTTP_CREATED = 201
const HTTP_OK = 200

const addressBookBase = () =>
  process.env.TRADE_IMPORTS_ADDRESS_BOOK_URL ?? 'http://localhost:8089'

const addressesUrl = () =>
  `${addressBookBase()}/organisation/${encodeURIComponent(ORGANISATION_ID)}/addresses`

const headers = () => ({
  'Content-Type': 'application/json',
  [ORGANISATION_ID_HEADER]: ORGANISATION_ID
})

export const ensureAddressBookHasAnAddress = async () => {
  const listed = await fetch(`${addressesUrl()}?page=1`, { headers: headers() })
  if (listed.status !== HTTP_OK) {
    throw new Error(
      `Could not list address book for Lighthouse seed (${listed.status})`
    )
  }
  const body = await listed.json()
  if ((body.totalItems ?? body.items?.length ?? 0) > 0) {
    return
  }

  const created = await fetch(addressesUrl(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name: 'Lighthouse Seed Address',
      addressLine1: '1 Test Street',
      townOrCity: 'London',
      postcode: 'SW1A 1AA',
      countryCode: 'GB',
      phone: '01632 960000',
      email: 'lighthouse@example.com'
    })
  })
  if (created.status !== HTTP_CREATED && created.status !== HTTP_OK) {
    throw new Error(
      `Could not create address for Lighthouse seed (${created.status})`
    )
  }
}
