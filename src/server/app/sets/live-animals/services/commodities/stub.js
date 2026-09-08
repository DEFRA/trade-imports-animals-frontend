export const COMMODITY_OPTIONS = ['Cow', 'Horse', 'Cat', 'Dog', 'Fish']

export const COMMODITY_CODES = {
  Cow: '0102',
  Horse: '0101',
  // Cat and Dog share the CN code; reverse lookup returns Cat first
  Cat: '01061900',
  Dog: '01061900',
  Fish: '0301'
}

// Species per commodity. Cow's four are the skeleton's mock-species.json for
// 0102; the others carry one representative species each so the batch search
// can select across commodity codes. `text` is the scientific name the backend
// payload carries; `commonName` is what the animal is called in English, and a
// species the catalogue holds no common name for is shown under the name of its
// commodity instead.
export const COMMODITY_SPECIES = {
  Cow: [
    { value: '716661', text: 'Bison bison', commonName: 'American bison' },
    { value: '1388624', text: 'Bos spp.', commonName: 'Cattle' },
    { value: '1148346', text: 'Bos taurus', commonName: 'Domestic cattle' },
    { value: '749313', text: 'Bubalus bubalis', commonName: 'Water buffalo' }
  ],
  Horse: [{ value: '822332', text: 'Equus caballus', commonName: 'Horse' }],
  Cat: [{ value: '923501', text: 'Felis catus', commonName: 'Cat' }],
  Dog: [{ value: '923502', text: 'Canis lupus familiaris', commonName: 'Dog' }],
  Fish: [
    { value: '801204', text: 'Salmo salar', commonName: 'Atlantic salmon' }
  ]
}

export const SPECIES_OPTIONS = Object.values(COMMODITY_SPECIES).flat()

// Type of commodity, per commodity, from the real IPAFFS commodity-categories
// MDM extract (commodity-type-data/commodity-types.json). Each type carries its
// real id, its display text and the species values that belong to it — the
// value is always the real non-blank type id, so every stored line has a type.
// 0102/Cow is the multi-type case (Domestic + Game): its species partition
// across the two types. The single-type commodities carry one blank-text type,
// so their type maps to nothing in the backend payload. Species values are the
// prototype's own COMMODITY_SPECIES; the extract's Domestic/Game split is
// applied to them by scientific name (Bos spp. is Game, the rest Domestic).
export const COMMODITY_TYPE_DATA = {
  Cow: [
    { id: '16', text: 'Domestic', species: ['716661', '1148346', '749313'] },
    { id: '24', text: 'Game', species: ['1388624'] }
  ],
  Horse: [{ id: '2', text: '', species: ['822332'] }],
  Cat: [{ id: '2', text: '', species: ['923501'] }],
  Dog: [{ id: '2', text: '', species: ['923502'] }],
  Fish: [{ id: '0301', text: '', species: ['801204'] }]
}

export const PACKAGE_COUNT_COMMODITIES = [
  '01064100 - Bees',
  '01063100 - Birds of Prey- Owls',
  '01063100 - Birds of Prey- Falcons',
  '01063100 - Birds of Prey- Other',
  'Cat',
  'Cow',
  'Dog',
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
  'Horse',
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

// The identifiers each commodity carries, in the order Design release 1 asks
// for them. The order belongs to the COMMODITY, not to the service: a cow is
// asked for its ear tag before its passport because the ear tag is what a cow
// actually carries, where a horse is asked for its microchip first
// (design 01-14/16/17). A commodity with an empty list — Fish — is asked for
// nothing at all: design release 1 offers no free-text fallback, so such a
// line gets no identification panel and no animal records.
//
// The five per-identifier allowlists below are DERIVED from this map, so an
// identifier's gate and its position on the panel cannot drift apart. Adding
// an identifier to a commodity is one edit here.
export const COMMODITY_IDENTIFIERS = {
  // A cow is asked for an ear tag and a passport and nothing else: design
  // release 1 puts the tattoo on commodity code 01061900 — the cat, dog and
  // ferret code — and not on 0102 (design 01-14/16/17).
  Cow: ['animalIdentifierEarTag', 'animalIdentifierPassport'],
  Horse: ['animalIdentifierMicrochip', 'animalIdentifierPassport', 'horseName'],
  Cat: [
    'animalIdentifierMicrochip',
    'animalIdentifierPassport',
    'animalIdentifierTattoo'
  ],
  Dog: [
    'animalIdentifierMicrochip',
    'animalIdentifierPassport',
    'animalIdentifierTattoo'
  ],
  Fish: []
}

const commoditiesCarrying = (identifier) =>
  COMMODITY_OPTIONS.filter((name) =>
    COMMODITY_IDENTIFIERS[name]?.includes(identifier)
  )

// The equine and companion-animal commodities. Design release 1 asks for a
// microchip on commodity code 0101 (Horse) and on 01061900 — the code Cat, Dog,
// ferret and the other live mammals share — so ferret is covered by the same
// entry as Cat and Dog once the picker offers it (design 01-16/17).
export const MICROCHIP_COMMODITIES = commoditiesCarrying(
  'animalIdentifierMicrochip'
)

export const PASSPORT_COMMODITIES = commoditiesCarrying(
  'animalIdentifierPassport'
)

export const TATTOO_COMMODITIES = commoditiesCarrying('animalIdentifierTattoo')

export const EAR_TAG_COMMODITIES = commoditiesCarrying('animalIdentifierEarTag')

export const HORSE_NAME_COMMODITIES = commoditiesCarrying('horseName')

// The commodities design release 1 asks a trader to identify at all — the
// ones the catalogue gives an identifier of their own. A commodity outside
// this list is asked for no animal records, so it is not held to the
// one-record-per-animal count either.
export const IDENTIFIED_COMMODITIES = COMMODITY_OPTIONS.filter(
  (name) => (COMMODITY_IDENTIFIERS[name] ?? []).length > 0
)

// A mandatory unitRecord obligation, so every commodity here must also be in
// IDENTIFIED_COMMODITIES above — a commodity asked for a permanent address but
// missing from that list gets no identification panel and no per-animal count
// rule, so the address is never collected. Pinned by commodities/index.test.js.
export const PERMANENT_ADDRESS_COMMODITIES = ['Cat', 'Dog']

export const UNWEANED_ANIMAL_COMMODITIES = ['Cow', 'Horse']

export const CPH_COMMODITIES = ['Cow']
