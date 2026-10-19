// The commodity rules, keyed by the CN code a commodity line carries, or by its Latin name where one code covers animals the design
// treats differently. MDM supplies the codes and names but no rules, so the
// rules are held here. A Latin-name rule matches MDM's spelling exactly: if
// MDM corrects a spelling, the rule stops matching and has to follow it.

// The identifiers each code carries, in the order they are asked for. The
// order belongs to the commodity: a cow is asked for its ear tag before its
// passport, a horse for its microchip first. A code not listed here is asked
// for no identifier at all — there is no free-text fallback — so its lines get
// no identification panel.
//
// The per-identifier allowlists below are derived from this map, so an
// identifier's gate and its position on the panel cannot drift apart.
export const COMMODITY_IDENTIFIERS = {
  // Cattle: an ear tag and a passport. The tattoo is asked on 01061900, not
  // on 0102.
  '0102': ['animalIdentifierEarTag', 'animalIdentifierPassport'],
  // Horses, asses, mules and hinnies.
  '0101': [
    'animalIdentifierMicrochip',
    'animalIdentifierPassport',
    'horseName'
  ],
  // Cats, dogs, ferrets and the other live mammals.
  '01061900': [
    'animalIdentifierMicrochip',
    'animalIdentifierPassport',
    'animalIdentifierTattoo'
  ]
}

const codesCarrying = (identifier) =>
  Object.keys(COMMODITY_IDENTIFIERS).filter((code) =>
    COMMODITY_IDENTIFIERS[code].includes(identifier)
  )

export const MICROCHIP_CODES = codesCarrying('animalIdentifierMicrochip')

export const PASSPORT_CODES = codesCarrying('animalIdentifierPassport')

export const TATTOO_CODES = codesCarrying('animalIdentifierTattoo')

export const EAR_TAG_CODES = codesCarrying('animalIdentifierEarTag')

export const HORSE_NAME_CODES = codesCarrying('horseName')

// The codes a trader is asked to identify at all. A line outside
// these is asked for no animal records, so it is not held to the
// one-record-per-species rule either.
export const IDENTIFIED_CODES = Object.keys(COMMODITY_IDENTIFIERS)

// The codes asked for a number of packages: the codes of the design's
// package-count list that MDM's live-animal data holds. That list named some
// entries by animal ("01061900 - Ferrets", "0101 - Donkey"), but each such
// code is on the list whole, so the code alone decides.
export const PACKAGE_COUNT_CODES = [
  '0101',
  '0102',
  '0103',
  '010410',
  '010420',
  '01051111',
  '01051200',
  '01051300',
  '01051400',
  '01051500',
  '01059400',
  '01059910',
  '01059920',
  '01059930',
  '01059950',
  '01061410',
  '01061900',
  '01062000',
  '01063100',
  '01063200',
  '01063980',
  '01064100',
  '01064900',
  '05111000',
  '05119985'
]

// The animals asked for each one's permanent address: domestic cats, dogs and
// ferrets, all under 01061900. The genus Felis (MDM's "Cat") is not one of
// them. MDM names the domestic dog Canis familiaris; Canis lupus familiaris is
// listed too in case MDM's clean-up renames it.
//
// A mandatory per-animal obligation, so each of these must sit under one of
// IDENTIFIED_CODES — a line with no identification panel gets no animal
// records to hold the address.
export const PERMANENT_ADDRESS_SPECIES = [
  'Felis catus',
  'Canis familiaris',
  'Canis lupus familiaris',
  'Mustela putorius furo'
]

// The codes asked whether the consignment holds unweaned animals: design
// release 1 puts unweaned options on cattle and pigs alone.
export const UNWEANED_CODES = ['0102', '0103']

// Every consignment is asked for a CPH number, so the list names the codes
// let off the question rather than the ones that need it: 0101, the
// horses code, and 01061900, the code asked for each animal's permanent
// address instead. Any other code, however new to the picker, is asked.
export const CPH_EXEMPT_CODES = ['0101', '01061900']

// Type of commodity, from the IPAFFS commodity-categories extract. Cattle is
// the one code with two types, Domestic and Game, split by Latin name. Every
// other code has one type with blank text, which the backend payload drops.
const DOMESTIC = { id: '16', text: 'Domestic' }
const GAME = { id: '24', text: 'Game' }
const SINGLE_TYPE = { id: '2', text: '' }

const MULTI_TYPE_CODE = '0102'

// The extract's Game species under 0102. MDM's data has "Bos sp.", not
// "Bos spp.", so today no 0102 species MDM offers is Game.
const GAME_SPECIES = ['Bos spp.']

const TYPES_BY_CODE = { [MULTI_TYPE_CODE]: [DOMESTIC, GAME] }

export const typeFor = (code, latinName) => {
  if (code !== MULTI_TYPE_CODE) {
    return SINGLE_TYPE
  }
  return GAME_SPECIES.includes(latinName) ? GAME : DOMESTIC
}

export const typesFor = (code) => TYPES_BY_CODE[code] ?? [SINGLE_TYPE]

// Commodity code 01061900 covers cats, dogs, ferrets and other live mammals,
// hundreds of species between them. The design lists a chosen species under
// it on its own rather than folding it into the commodity (design 01-14).
export const PER_SPECIES_CODE = '01061900'
