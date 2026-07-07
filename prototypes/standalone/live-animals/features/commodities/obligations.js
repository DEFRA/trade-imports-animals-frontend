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
export const commoditySelection = { id: 'commoditySelection', required: true }

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

/**
 * V4 Level 2: 1..N commodity lines per notification (spec ruling c-003 —
 * the skeleton's single-line shortcut is not a requirement). The nested
 * animalIdentifiers unit collection is deferred to M2 behind the
 * sibling-at-least-one model-extension gate.
 */
export const commodityLines = {
  id: 'commodityLines',
  collection: true,
  item: [
    commoditySelection,
    typeSelection,
    speciesSelection,
    numberOfPackages,
    numberOfAnimalsQuantity
  ],
  requiredAtLeastOne: true
}

export const obligations = [commodityLines]
