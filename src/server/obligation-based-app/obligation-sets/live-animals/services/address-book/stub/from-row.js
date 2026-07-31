/** A canned address-book record, one per line:
 * `id|name|address line 1|town or city|postal or zip code|country`. The ids
 * are stable — the picker's radio values and its carried selection are the id,
 * never a row index. */
export const fromRow = (row) => {
  const [id, name, addressLine1, townOrCity, postalOrZipCode, country] =
    row.split('|')
  return {
    id,
    name,
    address: { addressLine1, townOrCity, postalOrZipCode, country }
  }
}
