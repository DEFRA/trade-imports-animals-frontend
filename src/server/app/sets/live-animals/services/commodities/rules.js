export const HORSES_CODE = '0101'
export const CATTLE_CODE = '0102'
export const SWINE_CODE = '0103'
export const SHEEP_CODE = '010410'
export const GOAT_CODE = '010420'
export const OTHER_LIVE_MAMMALS_CODE = '01061900'

export const COMMODITY_IDENTIFIERS = {
  [CATTLE_CODE]: ['animalIdentifierEarTag', 'animalIdentifierPassport'],
  [HORSES_CODE]: [
    'animalIdentifierMicrochip',
    'animalIdentifierPassport',
    'horseName'
  ],
  [OTHER_LIVE_MAMMALS_CODE]: [
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

export const IDENTIFIED_CODES = Object.keys(COMMODITY_IDENTIFIERS)

export const PACKAGE_COUNT_CODES = [
  HORSES_CODE,
  CATTLE_CODE,
  SWINE_CODE,
  SHEEP_CODE,
  GOAT_CODE,
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
  OTHER_LIVE_MAMMALS_CODE,
  '01062000',
  '01063100',
  '01063200',
  '01063980',
  '01064100',
  '01064900'
]

const PERMANENT_ADDRESS_SPECIES = {
  [OTHER_LIVE_MAMMALS_CODE]: [
    'Felis catus',
    'Canis familiaris',
    'Mustela putorius furo'
  ]
}

export const PERMANENT_ADDRESS_CODE_SPECIES = Object.entries(
  PERMANENT_ADDRESS_SPECIES
).flatMap(([code, latinNames]) =>
  latinNames.map((latinName) => [code, latinName])
)

export const UNWEANED_CODES = [
  HORSES_CODE,
  CATTLE_CODE,
  SWINE_CODE,
  SHEEP_CODE,
  GOAT_CODE
]

export const CPH_EXEMPT_CODES = [HORSES_CODE, OTHER_LIVE_MAMMALS_CODE]

export const PER_SPECIES_CODE = OTHER_LIVE_MAMMALS_CODE

export const COMMODITY_DESCRIPTIONS = {
  [HORSES_CODE]: 'Live horses, asses, mules and hinnies',
  [CATTLE_CODE]: 'Live bovine animals',
  [OTHER_LIVE_MAMMALS_CODE]: 'Other live animals',
  '0301': 'Live fish'
}

export const COMMODITY_NAMES_BY_CODE = {
  [HORSES_CODE]: 'Horse',
  [CATTLE_CODE]: 'Cattle',
  '0301': 'Fish'
}
