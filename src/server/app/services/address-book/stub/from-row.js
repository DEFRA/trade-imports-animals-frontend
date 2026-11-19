/** A canned address-book record, one per line:
 * `id|name|address line 1|town or city|postal or zip code|country|country
 * code|roles`, `roles` a comma-separated list, empty for a record holding
 * none. The ids are stable — the picker's radio values and its carried
 * selection are the id, never a row index.
 *
 * Shaped to match what `client.js` maps a real record to, so nothing
 * downstream can tell stub mode from real mode by the shape it gets,
 * `countryCode` and `roles` included. */
export const fromRow = (row) => {
  const [
    id,
    name,
    addressLine1,
    townOrCity,
    postcode,
    country,
    countryCode,
    roles = ''
  ] = row.split('|')
  return {
    id,
    name,
    deleted: false,
    roles: roles ? roles.split(',') : [],
    address: {
      addressLine1,
      townOrCity,
      postcode,
      countryCode,
      country,
      phone: '01632 960000',
      email: `${id}@example.com`
    }
  }
}
