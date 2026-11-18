const ORGANISATION_ID = '5900001'
const ORGANISATION_ID_HEADER = 'Trade-Imports-Organisation-Id'
const HTTP_CREATED = 201
const HTTP_OK = 200

/** Every address book role the journey filters an address list by: one per
 * party picker, plus `BRANCH_ADDRESS` for the consignment contact page. A
 * role missing here leaves its page with no option to choose, and the seed
 * walk throws rather than reaching the pages after it. Keep in step with
 * `PARTIES` and `CONTACT_PARTY` in
 * `src/server/app/sets/live-animals/journeys/linear/features/addresses/parties.js`. */
const SELECTABLE_ADDRESS_ROLES = [
  'PLACE_OF_ORIGIN',
  'CONSIGNOR',
  'CONSIGNEE',
  'IMPORTER',
  'PLACE_OF_DESTINATION',
  'BRANCH_ADDRESS'
]

const addressBookBase = () =>
  process.env.TRADE_IMPORTS_ADDRESS_BOOK_URL ?? 'http://localhost:8089'

const addressesUrl = () =>
  `${addressBookBase()}/organisation/${encodeURIComponent(ORGANISATION_ID)}/addresses`

const headers = () => ({
  'Content-Type': 'application/json',
  [ORGANISATION_ID_HEADER]: ORGANISATION_ID
})

const existingAddresses = async () => {
  const listed = await fetch(`${addressesUrl()}?page=1&pageSize=100`, {
    headers: headers()
  })
  if (listed.status !== HTTP_OK) {
    throw new Error(
      `Could not list address book for Lighthouse seed (${listed.status})`
    )
  }
  return (await listed.json()).items ?? []
}

const rolesAlreadyCovered = (addresses) =>
  new Set(addresses.flatMap((address) => address.roles ?? []))

const createAddressHoldingRole = async (role) => {
  const created = await fetch(addressesUrl(), {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({
      name: `Lighthouse Seed ${role}`,
      addressLine1: '1 Test Street',
      townOrCity: 'London',
      postcode: 'SW1A 1AA',
      countryCode: 'GB',
      phone: '01632 960000',
      email: 'lighthouse@example.com',
      roles: [role]
    })
  })
  if (created.status !== HTTP_CREATED && created.status !== HTTP_OK) {
    throw new Error(
      `Could not create a "${role}" address for Lighthouse seed (${created.status})`
    )
  }
}

export const ensureAddressBookCoversEverySelectableRole = async () => {
  const covered = rolesAlreadyCovered(await existingAddresses())
  const uncovered = SELECTABLE_ADDRESS_ROLES.filter(
    (role) => !covered.has(role)
  )
  await Promise.all(uncovered.map(createAddressHoldingRole))
}
