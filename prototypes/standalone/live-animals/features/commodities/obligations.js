/**
 * V4 "Number of packages" commodity list (54 entries, spec c-021 ruling:
 * the list is treated as true and valid, including 0203 Pig Meat under
 * safeguard measure). A commodity line owes a package count only when its
 * commodity selection is one of these.
 */
export const PACKAGE_COUNT_COMMODITIES = [
  '01064100 - Bees',
  '01063100 - Birds of Prey- Owls',
  '01063100 - Birds of Prey- Falcons',
  '01063100 - Birds of Prey- Other',
  '01061900 - Cats',
  '0102 - Cattle',
  '01061900 - Dogs',
  '05119985 - Embryos/Ova - Cattle',
  '05119985 - Embryos/Ova - Goat',
  '05119985 - Embryos/Ova - Horse',
  '05119985 - Embryos/Ova - Sheep',
  '05119985 - Embryos/Ova - Pig',
  '01061900 - Ferrets',
  '01063980 - Game Birds - Adult Birds- Partridge',
  '01063980 - Game Birds - Adult Birds- Pheasant',
  '01063980 - Game Birds - Day old chicks - Partridge',
  '01063980 - Game Birds - Day old chicks - Pheasant',
  '04071919 - Game Birds - Hatching eggs - Pheasant and Partridge',
  '010420 - Goats',
  '0101 - Horse',
  '0101 - Donkey',
  '01064900 - Insects and other invertebrates',
  '01064900 - Asian Hornet',
  '0103 - Pig (Domestic)',
  '0203 - Pig Meat under safeguard measure',
  '01059400 - Poultry - Adult Birds - Chickens',
  '01059910 - Poultry - Adult Birds - Ducks',
  '01059920 - Poultry - Adult Birds - Geese',
  '01059930 - Poultry - Adult Birds - Turkeys',
  '01059950 - Poultry - Adult Birds - Guinea Fowl',
  '01051111 - Poultry - Day old chicks - Chickens',
  '01051200 - Poultry - Day old chicks - Turkeys',
  '01051300 - Poultry - Day old chicks - Ducks',
  '01051400 - Poultry - Day old chicks - Geese',
  '01051500 - Poultry - Day old chicks - Guinea Fowl',
  '04071100 - Poultry - Hatching eggs- Chickens',
  '04071911 - Poultry - Hatching eggs- Turkeys',
  '04071911 - Poultry - Hatching eggs- Geese',
  '04071919 - Poultry - Hatching eggs- Ducks',
  '04071919 - Poultry - Hatching eggs- Guinea Fowl',
  '01063200 - Psittaciformes (including parrots, parakeets, macaws and cockatoos)',
  '01061410 - Domestic European Rabbits',
  '01061410 - Domestic Rabbits- Other',
  '01062000 - Reptiles',
  '01061900 - Rodents',
  '05111000 - Semen - Cattle',
  '05119985 - Semen - Dog or Cat',
  '05119985 - Semen - Horse',
  '05119985 - Semen - Goat',
  '05119985 - Semen - Pig',
  '05119985 - Semen - Rodent/Rabbit',
  '05119985 - Semen - Sheep',
  '010410 - Sheep (Domestic)',
  '0407 - SPF Eggs'
]

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
    includes: PACKAGE_COUNT_COMMODITIES
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
 * The per-identifier-type commodity lists below are the VERBATIM V4 strings,
 * intersected with the vendored `COMMODITY_OPTIONS` stand-in (select.controller.js).
 * Only options that exist in that list today can actually gate; the rest are
 * recorded here and join automatically when the real MDM reference list lands
 * (spec ruling c-018). The `frame: "enclosing"` gate resolves each unit field
 * against its OWN enclosing commodity line's `commoditySelection` (inc-031
 * vocabulary; engine/evaluate/predicate.js).
 */

// V4 Passport commodities: Donkey and asses, Horse, Ponies, Zebras, Mules,
// Cattle, Cats, Dogs, Ferrets. In COMMODITY_OPTIONS today: Horse, Cattle,
// Cats, Dogs (the equine variants + Ferrets join with MDM).
const PASSPORT_COMMODITIES = [
  '0101 - Horse',
  '0102 - Cattle',
  '01061900 - Cats',
  '01061900 - Dogs'
]

// V4 Tattoo commodities: Cats, Dogs, Ferrets, Pigs, Bovine. In
// COMMODITY_OPTIONS today: Cats, Dogs. Ferrets, Pigs and the '0102 - Bovine'
// spelling (a different string than the '0102 - Cattle' option) join with MDM.
const TATTOO_COMMODITIES = ['01061900 - Cats', '01061900 - Dogs']

// V4 Ear Tag commodities: Cattle, Pig (Domestic), Sheep (Domestic), Goats. In
// COMMODITY_OPTIONS today: Cattle (Pig, Sheep, Goats join with MDM).
const EAR_TAG_COMMODITIES = ['0102 - Cattle']

// V4 Horse Name commodity: Horse only.
const HORSE_NAME_COMMODITIES = ['0101 - Horse']

// V4 Permanent Address commodities: Cats, Dogs, Ferrets. In COMMODITY_OPTIONS
// today: Cats, Dogs (Ferrets joins with MDM).
const PERMANENT_ADDRESS_COMMODITIES = ['01061900 - Cats', '01061900 - Dogs']

const enclosingCommodity = (includes) => ({
  obligation: commoditySelection,
  frame: 'enclosing',
  includes
})

export const animalIdentifierPassport = {
  id: 'animalIdentifierPassport',
  activatedBy: enclosingCommodity(PASSPORT_COMMODITIES),
  wipeOnExit: true
}

export const animalIdentifierTattoo = {
  id: 'animalIdentifierTattoo',
  activatedBy: enclosingCommodity(TATTOO_COMMODITIES),
  wipeOnExit: true
}

export const animalIdentifierEarTag = {
  id: 'animalIdentifierEarTag',
  activatedBy: enclosingCommodity(EAR_TAG_COMMODITIES),
  wipeOnExit: true
}

export const horseName = {
  id: 'horseName',
  activatedBy: enclosingCommodity(HORSE_NAME_COMMODITIES),
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
  activatedBy: enclosingCommodity(PERMANENT_ADDRESS_COMMODITIES),
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
