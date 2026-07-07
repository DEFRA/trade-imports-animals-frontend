/**
 * The consignment's parties, accreted one per select-spoke increment. Each
 * party is a scalar `{ name, address }` object saved BY COPY (spec ruling
 * c-020): choosing a party on its select spoke copies that party's name and
 * address block into the answer — nothing is shared by reference.
 *
 * consignor — V4 "Mandatory to submit" (enforcedAt=submit): blank never
 * blocks a save, but the notification cannot be submitted without one.
 */
export const consignor = { id: 'consignor', required: true }

export const obligations = [consignor]
