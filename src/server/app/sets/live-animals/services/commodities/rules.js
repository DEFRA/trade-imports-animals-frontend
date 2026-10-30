export const HORSES_CODE = '0101'
export const CATTLE_CODE = '0102'
export const SWINE_CODE = '0103'
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
    'Canis lupus familiaris',
    'Mustela putorius furo'
  ]
}

export const PERMANENT_ADDRESS_CODE_SPECIES = Object.entries(
  PERMANENT_ADDRESS_SPECIES
).flatMap(([code, latinNames]) =>
  latinNames.map((latinName) => [code, latinName])
)

export const UNWEANED_CODES = [CATTLE_CODE]

export const CPH_EXEMPT_CODES = [HORSES_CODE, OTHER_LIVE_MAMMALS_CODE]

const DOMESTIC = { id: '16', text: 'Domestic' }
const GAME = { id: '24', text: 'Game' }
const SINGLE_TYPE = { id: '2', text: '' }

const GAME_SPECIES = new Set(['Bos sp.'])

const TYPES_BY_CODE = {
  [CATTLE_CODE]: {
    types: [DOMESTIC, GAME],
    typeOf: (latinName) => (GAME_SPECIES.has(latinName) ? GAME : DOMESTIC)
  }
}

const SINGLE_TYPE_CODE_TYPES = {
  types: [SINGLE_TYPE],
  typeOf: () => SINGLE_TYPE
}

const codeTypes = (code) => TYPES_BY_CODE[code] ?? SINGLE_TYPE_CODE_TYPES

export const typeFor = (code, latinName) => codeTypes(code).typeOf(latinName)

export const typesFor = (code) => codeTypes(code).types

export const PER_SPECIES_CODE = OTHER_LIVE_MAMMALS_CODE
