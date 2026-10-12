// MACHINE-DRAFT Welsh — not reviewed by a translator. Do not ship user-facing without Welsh Language Standards sign-off.
export const copy = {
  title: 'Rheoli templedi',
  intro: 'Dewiswch, rheolwch neu crëwch dempledi hysbysu newydd',
  createNew: 'Creu templed newydd',
  listHeading: 'Fy nhempledi',
  results: {
    none: 'Dangos 0 o 0 canlyniad',
    all: (total) => `Dangos 1-${total} o ${total} canlyniad`
  },
  card: {
    label: (title) => `Templed ${title}`,
    view: 'Gweld y templed',
    use: 'Defnyddio’r templed',
    rows: {
      commodity: 'Nwydd',
      origin: 'Tarddiad',
      consignee: 'Derbynnydd',
      consignor: 'Anfonwr'
    },
    notApplicable: 'Amherthnasol'
  },
  untitled: 'Templed heb deitl',
  categories: {
    'live-animals': 'Anifeiliaid byw',
    'germinal-products': 'Cynhyrchion germinol'
  },
  saved: {
    title: 'Llwyddiant',
    heading: (title) => `${title} wedi’i gadw yn y templedi`
  }
}
