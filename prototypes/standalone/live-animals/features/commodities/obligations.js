import * as commodities from '../../services/commodities/index.js'

// enforcedAt=continue (spec ruling c-023): the select page's controller
// schema blocks Save and Continue while it is blank.
export const commoditySelection = {
  id: 'commoditySelection',
  required: true,
  enforcedAt: 'continue'
}

export const typeSelection = { id: 'typeSelection', required: true }

export const speciesSelection = { id: 'speciesSelection', required: true }

export const numberOfPackages = {
  id: 'numberOfPackages',
  activatedBy: {
    obligation: commoditySelection,
    includes: commodities.packageCountCommodities()
  },
  wipeOnExit: true
}

export const numberOfAnimalsQuantity = {
  id: 'numberOfAnimalsQuantity',
  required: true
}

/*
 * === V4 Level 3: the animalIdentifiers unit collection (inc-035) ===
 *
 * The per-identifier-type commodity lists come from the commodities reference
 * service (services/commodities), the swap point when the real MDM list lands
 * (spec ruling c-018). The `frame: "enclosing"` gate resolves each unit field
 * against its OWN enclosing commodity line's `commoditySelection` (inc-031
 * vocabulary; engine/evaluate/predicate.js).
 */

const enclosingCommodity = (includes) => ({
  obligation: commoditySelection,
  frame: 'enclosing',
  includes
})

export const animalIdentifierPassport = {
  id: 'animalIdentifierPassport',
  activatedBy: enclosingCommodity(commodities.passportCommodities()),
  wipeOnExit: true
}

export const animalIdentifierTattoo = {
  id: 'animalIdentifierTattoo',
  activatedBy: enclosingCommodity(commodities.tattooCommodities()),
  wipeOnExit: true
}

export const animalIdentifierEarTag = {
  id: 'animalIdentifierEarTag',
  activatedBy: enclosingCommodity(commodities.earTagCommodities()),
  wipeOnExit: true
}

export const horseName = {
  id: 'horseName',
  activatedBy: enclosingCommodity(commodities.horseNameCommodities()),
  wipeOnExit: true
}

/*
 * The two free-text fallbacks are "shown when the commodity has NO specific
 * identifier type" — a NEGATED cross-frame condition with no explicit commodity
 * list, which the frame:enclosing/anyItem vocabulary cannot express (spec
 * conflict c-028, resolved-as-deferred). Rendered ALWAYS-in-unit-scope here as
 * the conservative interim (slightly over-shows when a typed identifier
 * applies, but "at least one" still holds); no activatedBy, no negation gate is
 * invented. Both are individually optional and both count towards requiredOneOf.
 */
export const animalIdentifierIdentificationDetails = {
  id: 'animalIdentifierIdentificationDetails'
}

export const animalIdentifierDescription = {
  id: 'animalIdentifierDescription'
}

/**
 * Per-animal Permanent Address (V4 Level 3): the FIRST required
 * enclosing-gated carrier. Required per unit only when the enclosing commodity
 * line is Cats or Dogs (Ferrets with MDM); off-gate it is out of scope and NOT
 * owed — see DESIGN-DELTA #5 for the completeness threading that makes the
 * roll-up match scope. Committed as one { name, address } object (the
 * party-record shape, c-020), like the private transporter fieldGroup.
 */
export const permanentAddress = {
  id: 'permanentAddress',
  required: true,
  activatedBy: enclosingCommodity(commodities.permanentAddressCommodities()),
  wipeOnExit: true
}

/** The six identifier fields that satisfy the requiredOneOf group. */
export const ANIMAL_IDENTIFIER_GROUP = [
  animalIdentifierPassport.id,
  animalIdentifierTattoo.id,
  animalIdentifierEarTag.id,
  horseName.id,
  animalIdentifierIdentificationDetails.id,
  animalIdentifierDescription.id
]

/**
 * V4 Level 3: 0..N unit records per commodity line (spec: animalIdentifiers).
 * Two mandate facts compose (they do not interact):
 * - `requiredAtLeastOne` — every commodity line owes >=1 unit record.
 * - `requiredOneOf` — each unit owes at least one of the six identifier fields
 *   ("at least one animal identifier PER ANIMAL", inc-032). permanentAddress is
 *   an item but is deliberately NOT in the group.
 */
export const animalIdentifiers = {
  id: 'animalIdentifiers',
  collection: true,
  item: [
    animalIdentifierPassport,
    animalIdentifierTattoo,
    animalIdentifierEarTag,
    horseName,
    animalIdentifierIdentificationDetails,
    animalIdentifierDescription,
    permanentAddress
  ],
  requiredAtLeastOne: true,
  requiredOneOf: ANIMAL_IDENTIFIER_GROUP
}

/**
 * V4 Level 2: 1..N commodity lines per notification (spec ruling c-003 —
 * the skeleton's single-line shortcut is not a requirement). Each line owns a
 * nested animalIdentifiers unit collection (inc-035, the first live depth-2
 * carrier since the car named-driver section).
 */
export const commodityLines = {
  id: 'commodityLines',
  collection: true,
  item: [
    commoditySelection,
    typeSelection,
    speciesSelection,
    numberOfPackages,
    numberOfAnimalsQuantity,
    animalIdentifiers
  ],
  requiredAtLeastOne: true
}

export const obligations = [commodityLines]
