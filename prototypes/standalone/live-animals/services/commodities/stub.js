// Vendored MDM commodities reference data (picklist, types, species, and the commodity-keyed applicability lists) — the swap point when the real reference-data service lands (spec ruling c-018).

// The vendored commodity picklist stand-in. Values are the V4 list entries
// verbatim — code plus name — because the V4 conditional-field lists key on
// those exact strings, and code alone is ambiguous (01061900 covers Cats, Dogs,
// Ferrets and Rodents).
export const COMMODITY_OPTIONS = [
  '0102 - Cattle',
  '0101 - Horse',
  '01061900 - Cats',
  '01061900 - Dogs',
  '0301 - Fish'
]

export const TYPE_OPTIONS = [
  { value: 'domestic', text: 'Domestic' },
  { value: 'game', text: 'Game' }
]

export const SPECIES_OPTIONS = [
  { value: 'bison-bison', text: 'Bison bison (Bison)' },
  { value: 'bos-spp', text: 'Bos spp. (Cattle species)' },
  { value: 'bos-taurus', text: 'Bos taurus (Cattle)' },
  { value: 'bubalus-bubalis', text: 'Bubalus bubalis (Water buffalo)' }
]

// V4 "Number of packages" commodity list (54 entries, spec c-021 ruling: the
// list is treated as true and valid, including 0203 Pig Meat under safeguard
// measure). A commodity line owes a package count only when its commodity
// selection is one of these.
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

// The per-identifier-type commodity lists are the VERBATIM V4 strings,
// intersected with the vendored COMMODITY_OPTIONS stand-in above. Only options
// that exist in that list today can actually gate; the rest join automatically
// when the real MDM reference list lands (spec ruling c-018).

// V4 Passport commodities: Donkey and asses, Horse, Ponies, Zebras, Mules,
// Cattle, Cats, Dogs, Ferrets. Present today: Horse, Cattle, Cats, Dogs.
export const PASSPORT_COMMODITIES = [
  '0101 - Horse',
  '0102 - Cattle',
  '01061900 - Cats',
  '01061900 - Dogs'
]

// V4 Tattoo commodities: Cats, Dogs, Ferrets, Pigs, Bovine. Present today: Cats,
// Dogs (Ferrets, Pigs and the '0102 - Bovine' spelling join with MDM).
export const TATTOO_COMMODITIES = ['01061900 - Cats', '01061900 - Dogs']

// V4 Ear Tag commodities: Cattle, Pig (Domestic), Sheep (Domestic), Goats.
// Present today: Cattle (Pig, Sheep, Goats join with MDM).
export const EAR_TAG_COMMODITIES = ['0102 - Cattle']

// V4 Horse Name commodity: Horse only.
export const HORSE_NAME_COMMODITIES = ['0101 - Horse']

// V4 Permanent Address commodities: Cats, Dogs, Ferrets. Present today: Cats,
// Dogs (Ferrets joins with MDM).
export const PERMANENT_ADDRESS_COMMODITIES = [
  '01061900 - Cats',
  '01061900 - Dogs'
]

// V4 unweaned-animal commodity GROUPS — equines (0101), cattle (0102), pigs
// (0103), sheep (010410), goats (010420). Present today: Horse and Cattle;
// pigs, sheep and goats join when the MDM commodity list grows to carry them.
export const UNWEANED_ANIMAL_COMMODITIES = ['0102 - Cattle', '0101 - Horse']

// V4 CPH commodity list — 19 commodities across cattle (0102), pigs (0103),
// sheep (010410), goats (010420) and poultry/hatching-eggs (0105*, 0407*).
// Equines (0101) are NOT on the CPH list. Present today: Cattle only; the other
// 18 join when the MDM commodity list grows to carry them.
export const CPH_COMMODITIES = ['0102 - Cattle']
