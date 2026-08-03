const freezeTreeNode = ({
  code,
  description,
  children,
  plantsForPlanting = false
}) =>
  Object.freeze({
    code,
    description,
    ...(plantsForPlanting ? { plantsForPlanting } : {}),
    ...(children
      ? { children: Object.freeze(children.map(freezeTreeNode)) }
      : {})
  })

const freezeRecordOfArrays = (record) =>
  Object.freeze(
    Object.fromEntries(
      Object.entries(record).map(([key, values]) => [
        key,
        Object.freeze(
          values.map((value) =>
            typeof value === 'object' ? Object.freeze(value) : value
          )
        )
      ])
    )
  )

export const COMMODITY_TREE = Object.freeze(
  [
    {
      code: '06',
      description:
        'LIVE TREES AND OTHER PLANTS; BULBS, ROOTS AND THE LIKE; CUT FLOWERS AND ORNAMENTAL FOLIAGE',
      children: [
        {
          code: '06011010',
          description: 'Hyacinths',
          plantsForPlanting: true
        },
        { code: '0603197090', description: 'Other' },
        { code: '06042090', description: 'Other' }
      ]
    },
    {
      code: '07',
      description: 'EDIBLE VEGETABLES AND CERTAIN ROOTS AND TUBERS',
      children: [{ code: '0713500010', description: 'For sowing' }]
    },
    {
      code: '08',
      description: 'EDIBLE FRUIT AND NUTS; PEEL OF CITRUS FRUIT OR MELONS',
      children: [
        { code: '08059000', description: 'Other' },
        { code: '0808108010', description: 'Cider apples' }
      ]
    },
    {
      code: '09',
      description: 'COFFEE, TEA, MATÉ AND SPICES',
      children: [{ code: '09103000', description: 'Turmeric (curcuma)' }]
    },
    {
      code: '10',
      description: 'CEREALS',
      children: [{ code: '10083000', description: 'Canary seed' }]
    },
    {
      code: '12',
      description:
        'OIL SEEDS AND OLEAGINOUS FRUITS; MISCELLANEOUS GRAINS, SEEDS AND FRUIT; INDUSTRIAL OR MEDICINAL PLANTS; STRAW AND FODDER',
      children: []
    },
    {
      code: '14',
      description:
        'VEGETABLE PLAITING MATERIALS; VEGETABLE PRODUCTS NOT ELSEWHERE SPECIFIED OR INCLUDED',
      children: [{ code: '14019000', description: 'Other' }]
    },
    {
      code: '25',
      description:
        'SALT; SULPHUR; EARTHS AND STONE; PLASTERING MATERIALS, LIME AND CEMENT',
      children: []
    },
    {
      code: '38',
      description: 'MISCELLANEOUS CHEMICAL PRODUCTS',
      children: []
    },
    {
      code: '84',
      description:
        'NUCLEAR REACTORS, BOILERS, MACHINERY AND MECHANICAL APPLIANCES; PARTS THEREOF',
      children: [{ code: '84321000', description: 'Ploughs' }]
    },
    {
      code: '87',
      description:
        'VEHICLES OTHER THAN RAILWAY OR TRAMWAY ROLLING STOCK, AND PARTS AND ACCESSORIES THEREOF',
      children: [
        {
          code: '87019510',
          description: 'Agricultural tractors and forestry tractors, wheeled'
        }
      ]
    }
  ].map(freezeTreeNode)
)

export const SPECIES_BY_CODE = freezeRecordOfArrays({
  '06011010': [
    {
      eppoCode: 'ABWBR',
      genusAndSpecies: 'Albuca bracteata',
      speciesId: '1325967'
    }
  ],
  '0603197090': [
    {
      eppoCode: 'GYPEL',
      genusAndSpecies: 'Gypsophila elegans',
      speciesId: '1355418'
    }
  ],
  '06042090': [
    {
      eppoCode: 'CXQDA',
      genusAndSpecies: '+ Crataegomespilus dardarii',
      speciesId: '1345651'
    },
    {
      eppoCode: 'LENCU',
      genusAndSpecies: 'Lens culinaris',
      speciesId: '1346687'
    }
  ],
  '0713500010': [
    {
      eppoCode: 'VICHI',
      genusAndSpecies: 'Vicia hirsuta',
      speciesId: '1367380'
    }
  ],
  '08059000': [
    {
      eppoCode: 'CIDAC',
      genusAndSpecies: 'Citrus australasica',
      speciesId: '1364882'
    }
  ],
  '0808108010': [
    {
      eppoCode: 'MABSD',
      genusAndSpecies: 'Malus domestica',
      speciesId: '1391442'
    }
  ],
  '09103000': [
    {
      eppoCode: 'CURLO',
      genusAndSpecies: 'Curcuma longa',
      speciesId: '1402229'
    }
  ],
  10083000: [
    {
      eppoCode: 'PHAAN',
      genusAndSpecies: 'Phalaris angusta',
      speciesId: '1416873'
    }
  ],
  14019000: [
    {
      eppoCode: 'AEAFL',
      genusAndSpecies: 'Adenaria floribunda',
      speciesId: '1333611'
    }
  ],
  84321000: [
    {
      eppoCode: 'NNNXX',
      genusAndSpecies: 'no plants',
      speciesId: '1435652'
    }
  ],
  87019510: [
    {
      eppoCode: 'NNNXX',
      genusAndSpecies: 'no plants',
      speciesId: '1435652'
    }
  ]
})

export const VARIETIES_BY_EPPO = freezeRecordOfArrays({
  CIDAC: [{ id: 'NONE', label: 'None' }],
  MABSD: [
    {
      id: '03107EFA-9BCD-1089-565E-B28F73994DEC',
      label: 'McIntosh Red'
    },
    {
      id: '035ECF9F-7B6C-078D-60D5-D2947C23A366',
      label: 'Spartan'
    }
  ]
})

export const CLASSES_BY_EPPO = freezeRecordOfArrays({
  CIDAC: ['CLASS_I', 'CLASS_II', 'EXTRA_CLASS']
})

export const CLASS_LABELS = Object.freeze({
  CLASS_I: 'Class I',
  CLASS_II: 'Class II',
  EXTRA_CLASS: 'Extra Class'
})
