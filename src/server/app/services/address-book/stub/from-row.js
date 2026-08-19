/** A canned address-book record, one per line:
 * `id|name|address line 1|town or city|postal or zip code|country`. The ids
 * are stable — the picker's radio values and its carried selection are the id,
 * never a row index.
 *
 * Shaped to match what `client.js` maps a real record to, so nothing
 * downstream can tell stub mode from real mode by the shape it gets. */
export const fromRow = (row) => {
  const [id, name, addressLine1, townOrCity, postalOrZipCode, country] =
    row.split('|')
  return {
    id,
    name,
    deleted: false,
    address: {
      addressLine1,
      townOrCity,
      postalOrZipCode,
      country,
      telephoneNumber: '01632 960000',
      emailAddress: `${id}@example.com`
    }
  }
}
