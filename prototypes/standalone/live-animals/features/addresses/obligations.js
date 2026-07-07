/**
 * The consignment's parties, accreted one per select-spoke increment. Each
 * party is a scalar `{ name, address }` object saved BY COPY (spec ruling
 * c-020): choosing a party on its select spoke copies that party's name and
 * address block into the answer — nothing is shared by reference.
 *
 * consignor — V4 "Mandatory to submit" (enforcedAt=submit): blank never
 * blocks a save, but the notification cannot be submitted without one.
 * placeOfDestination — V4 "Mandatory to submit" (enforcedAt=submit): the
 * same shape and mandate as the consignor.
 * placeOfOrigin — V4 "Mandatory to submit" (enforcedAt=submit): the same
 * shape and mandate again; a dead spoke in the skeleton (c-005), landed
 * here as a provisional select page.
 * consignee — V4 "Mandatory to submit" (enforcedAt=submit): the same shape
 * and mandate again; another dead spoke in the skeleton (c-005), landed
 * here as a provisional select page.
 * importer — V4 "Mandatory to submit" (enforcedAt=submit): the last party;
 * the same shape and mandate again; the third dead spoke in the skeleton
 * (c-005), landed here as a provisional select page.
 */
export const consignor = { id: 'consignor', required: true }

export const placeOfDestination = { id: 'placeOfDestination', required: true }

export const placeOfOrigin = { id: 'placeOfOrigin', required: true }

export const consignee = { id: 'consignee', required: true }

export const importer = { id: 'importer', required: true }

export const obligations = [
  consignor,
  placeOfDestination,
  placeOfOrigin,
  consignee,
  importer
]
