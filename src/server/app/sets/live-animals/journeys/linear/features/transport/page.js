export const portOfEntryPage = {
  id: 'port-of-entry',
  slug: 'port-of-entry'
}

export const transitCountriesPage = {
  id: 'transit-countries',
  slug: 'transit-countries'
}

/** The transporter list — the journey's one transporter step. Every
 * transporter the trader can use is on it, commercial and private together,
 * and the pick carries the type with it (design release 1). */
export const transportersPage = {
  id: 'transporters',
  slug: 'transporters'
}

/** Off the linear journey: the first step of adding a transporter that is not
 * on the list. Asked only of a trader who could not find theirs, which is why
 * it is reached from the list rather than sitting in front of it. */
export const transporterAddPage = {
  id: 'transporter-add',
  slug: 'transporters/add'
}

export const transportersSelectPage = {
  id: 'transporters-select',
  slug: 'transporters/select'
}

/** Off the linear journey: the commercial arm of the add route. The form a
 * trader fills in for a commercial transporter that is not on the list, giving
 * its authorisation number, name, address and contact details (design release
 * 1). Its country is fixed to Northern Ireland, which is the restriction the
 * type chooser states on the Commercial option. */
export const commercialTransporterDetailsPage = {
  id: 'commercial-transporter-details',
  slug: 'transporters/add/commercial'
}

export const privateTransporterDetailsPage = {
  id: 'private-transporter-details',
  slug: 'transporters/add/private'
}
